import OSS from 'ali-oss';

import Ajax from 'components/Utils/Ajax';
// import Utils from 'components/Utils/Utils';
// let utils = new Utils();

export default class ResumableUpload {
  constructor() {
    this.upload = this.upload.bind(this);
    this.stop = this.stop.bind(this);
    this._fingerprint = this._fingerprint.bind(this);
    this._getStsToken = this._getStsToken.bind(this);
    this._getPartSize = this._getPartSize.bind(this);
    this._getCheckpoint = this._getCheckpoint.bind(this);
    this._setCheckpoint = this._setCheckpoint.bind(this);
    this._emitStartPartUpload = this._emitStartPartUpload.bind(this);
    this._emitProgress = this._emitProgress.bind(this);
    this._emitFail = this._emitFail.bind(this);
    this._emitComplete = this._emitComplete.bind(this);
    this._init = this._init.bind(this);
    this._start = this._start.bind(this);
    this._multipartUpload = this._multipartUpload.bind(this);
    this._completeUpload = this._completeUpload.bind(this);
  }

  upload(file, options) {
    if (!file) {
      return;
    }
    this._init(file, options);
    this._start();
  }
  stop() {
    this.stopStatus = true;

    this.ossClient && this.ossClient.stopMultipartUpload();
    if (this.getStsTimer) {
      clearInterval(this.getStsTimer);
      this.getStsTimer = null;
    }
    if (this.completeAjax) {
      this.completeAjax.abort();
      this.finishStop && this.finishStop();
      this.completeAjax = null;
      return true;
    }
  }

  _init(file, options) {
    this.startUploadPartNum = -1;
    this.finishUploadPartNum = -1;
    this.hangMultipartUpload = false;

    this.ossClient = null;

    this._statusInit();

    let userid = options.userid,
      cataid = options.cataid;

    this.file = file;
    var keepsource = 0;
    if (options.extra) {
      var extra = JSON.parse(options.extra);
      if (extra.keepsource) {
        keepsource = extra.keepsource;
      }
    }
    this.fileData = {
      cataid: cataid,
      desc: options.desc,
      ext: options.ext,
      extra: options.extra,
      luping: options.luping,
      title: options.title,
      tag: options.tag,
      keepsource: keepsource,
      fingerprint: options.fingerprint || this._fingerprint(file, options.title, {
        userid,
        cataid
      }),
      vid: '',
    };
    this.url_getStsInfo = options.url_getStsInfo;
    this.url_getToken = options.url_getToken;
    this.url_completeUpload = options.url_completeUpload;

    // 回调函数
    this.progress = options.progress;
    this.done = options.done;
    this.fail = options.fail;
    this.finishStop = options.finishStop;
    this.disabledPause = options.disabledPause || function() {};
  }

  _start() {
    // 两种情况：1.需要续传；2.已完成上传，需要发起completeUpload请求
    let fingerprint = this.fileData.fingerprint;
    let fileInfo = this._getCheckpoint(fingerprint);
    if (typeof(fileInfo) === 'object' && fileInfo) {
      if (fileInfo.state === 'COMPLETE') {
        this._completeUpload(fileInfo.videoUrl, fileInfo.etag, fileInfo.vid);
        return;
      } else {
        this.checkpoint = this._getCheckpoint(fingerprint);
      }
    }

    if (typeof this.checkpoint === 'object' && this.checkpoint) {
      this._emitProgress(this.checkpoint.file.progress / 100);
    }
    this._initUpload();
    // 阿里云STS授权token有效期为1h，超过该期限时需要重新获取token
    this.getStsTimer = setInterval(() => {
      this.hangGetStsToken = true;
      this.ossClient && this.ossClient.stopMultipartUpload();
    }, 57 * 60 * 1000);
  }

  _initUpload() {
    let userData = window.userData;
    let fileData = this.fileData;

    Ajax.ajax(this.url_getStsInfo.replace('{userid}', userData.userid), {
      method: 'POST',
      data: {
        ptime: userData.ptime,
        sign: userData.sign,
        hash: userData.hash,

        title: fileData.title,
        describ: fileData.desc,
        cataid: fileData.cataid,
        tag: fileData.tag,
        luping: fileData.luping,
        keepsource: fileData.keepsource,

        filesize: this.file.size,

        autoid: 1, // 自动生成vid，无需在请求参数中传vid
        uploadType: 'plugin_aliyun_chunk',
        compatible: 1,
      }
    }).then((res) => {
      // 如果已经停止就不能继续下一步
      if (this.stopStatus) {
        this.finishStop && this.finishStop();
        return;
      }
      // 处理可能出错的情况
      let data = res.data;
      if (res.status !== 'success') {
        if (this.initUploadRetryTimes > 0) {
          this._initUpload();
          this.initUploadRetryTimes--;
        } else {
          this._emitFail({
            message: '获取token信息失败，请点击续传重试。',
          });
        }

        return;
      }
      // 用户剩余空间不足
      if (this.file.size > data.remainSpace) {
        this._emitFail({
          message: '您的剩余空间不足，请及时联系客服升级空间',
          reason: 'overSize'
        });
        return;
      }
      // vid用于返回到外层iframe给用户
      this.fileData.vid = data.vid;

      // window.endpoint = data.endpoint;
      // window.bucketName = data.bucketName;
      // 封装OSS对象
      let stsInfo = {
        endpoint: window.location.protocol + '//' + data.domain,
        bucket: data.bucketName,
        accessKeyId: data.accessId,
        accessKeySecret: data.accessKey,
        stsToken: data.token,
        secure: window.location.protocol.toLocaleUpperCase() === 'HTTPS:',
        cname: true
      };

      this.ossClient = new OSS.Wrapper(stsInfo);

      this.filename_oss = data.dir + data.vid + this.file.name.substring(this.file.name.lastIndexOf('.'));
      this._multipartUpload();
    }).catch(err => {
      if (this.initUploadRetryTimes > 0) {
        this._initUpload();
        this.initUploadRetryTimes--;
      } else {
        this._emitFail({
          message: '获取sts信息失败，请检查当前网络。',
        });
      }

      console.log(err);
    });
  }

  _multipartUpload() {
    if (this.stopStatus || this.hangMultipartUpload) {
      return;
    }
    if (this.startUploadPartNum > this.finishUploadPartNum) {
      this.hangMultipartUpload = true;
      return;
    }
    // 从本地获取checkpoint
    let fingerprint = this.fileData.fingerprint;
    this.checkpoint = this._getCheckpoint(fingerprint);
    if (typeof this.checkpoint === 'object' && this.checkpoint) {
      this.checkpoint.file = this.file;
    }
    // 断点续传
    this.ossClient && this.ossClient.multipartUpload(
      this.filename_oss,
      this.file, {
        partSize: this._getPartSize(this.file.size),
        progress: this._emitProgress,
        checkpoint: this.checkpoint,
        startPartUpload: this._emitStartPartUpload,
      }
    ).then(result => {
      if (result.stop) {
        if (this.hangGetStsToken) {
          this.hangGetStsToken = false;
          this._getStsToken();
        } else {
          this.finishStop && this.finishStop();
        }
        return;
      }

      let tempArr = result.res.requestUrls[0].split('?');
      let videoUrl = tempArr[0];

      let vid = this.fileData.vid;
      let etag = result.etag;

      let fileInfo = {
        state: 'COMPLETE',
        etag: etag,
        videoUrl: videoUrl,
        vid: vid,
      };
      localStorage.setItem(fingerprint, JSON.stringify(fileInfo));

      if (this.stopStatus) {
        this.finishStop && this.finishStop();
        return;
      }

      this._completeUpload(videoUrl, etag, vid);
    }).catch(err => {
      console.log(err);
      this.hangMultipartUpload = false;
      this.startUploadPartNum = this.finishUploadPartNum = -1;
      if (err.name === 'NoSuchUploadError') {
        localStorage.removeItem(fingerprint);
        this._multipartUpload();
        return;
      }

      if (this.multipartUploadRetryTimes > 0) {
        this.multipartUploadRetryTimes--;

        this._getStsToken();
        return;
      } else {
        this.stop();
        this._emitFail({
          message: '网络错误，请检查当前网络后续传。',
        });
      }
    });
  }

  _completeUpload(videoUrl, etag, vid) {
    videoUrl = videoUrl.replace('https://', 'http://');

    if (this.stopStatus) {
      return;
    }
    if (!videoUrl || !etag || !vid) {
      let fingerprint = this.fileData.fingerprint;
      localStorage.removeItem(fingerprint);
      this._initUpload();
      return;
    }

    this.disabledPause(true);
    let userData = window.userData;
    this.completeAjax = Ajax.post({
      url: this.url_completeUpload.replace('{userid}', userData.userid),
      data: {
        ptime: userData.ptime,
        sign: userData.sign,
        hash: userData.hash,
        object: videoUrl,
        etag: etag,
        vid: vid,
        compatible: 1,
      },
      done: res => {
        this.disabledPause(false);
        if (res.status !== 'success') {
          if (this.completeUploadRetryTimes > 0) {
            this._completeUpload(videoUrl, etag, vid);
            this.completeUploadRetryTimes--;
          } else {
            this._emitFail({
              message: '上传失败，失败信息：' + res.message,
            });
          }

          return;
        }

        this.completeAjax = null;
        let fingerprint = this.fileData.fingerprint;
        localStorage.removeItem(fingerprint);
        this._emitProgress(1, null);
        if (this.getStsTimer) {
          clearInterval(this.getStsTimer);
          this.getStsTimer = null;
        }
        this._emitComplete();
      },
      fail: err => {
        if (this.completeUploadRetryTimes > 0) {
          this.completeUploadRetryTimes--;
          this._completeUpload(videoUrl, etag, vid);
        } else {
          this._emitFail({
            message: '上传失败，请检查当前网络。',
          });
        }
        console.log(err);
      }
    });
  }

  _getStsToken() {
    let userData = window.userData;
    let url_getToken = this.url_getToken.replace('{userid}', userData.userid);
    Ajax.ajax(url_getToken, {
      data: {
        ptime: userData.ptime,
        sign: userData.sign,
        hash: userData.hash,
        compatible: 1,
      }
    }).then(res => {
      if (this.stopStatus) {
        this.finishStop && this.finishStop();
        return;
      }
      if (res.status !== 'success') {
        if (this.getStsTokenRetryTimes > 0) {
          this._getStsToken();
          this.getStsTokenRetryTimes--;
        } else {
          this.stop();
          this._emitFail({
            message: '获取sts信息失败，请刷新页面重试。',
          });
        }

        return;
      }

      let data = res.data;
      let stsInfo = {
        endpoint: window.location.protocol + '//' + data.domain,
        bucket: data.bucketName,
        accessKeyId: data.accessId,
        accessKeySecret: data.accessKey,
        stsToken: data.token,
        secure: window.location.protocol.toLocaleUpperCase() === 'HTTPS:',
        cname: true
      };
      this.ossClient = new OSS.Wrapper(stsInfo);

      // if (typeof(callback) === 'function') {
      //     callback();
      // }
      this._multipartUpload();
    }).catch(err => {
      if (this.getStsTokenRetryTimes > 0) {
        this._getStsToken();
        this.getStsTokenRetryTimes--;
      } else {
        this.stop();
        this._emitFail({
          message: '获取sts信息失败，请检查当前网络。',
        });
      }
      console.log(err);
    });
  }

  _statusInit() {
    this.multipartUploadRetryTimes = 10;
    this.completeUploadRetryTimes = 10;
    this.getStsTokenRetryTimes = 10;
    this.initUploadRetryTimes = 10;
    this.completeAjax = null;
    this.lastPartNum = 0;
    this.stopStatus = false;
    this.getStsTimer = null;
    this.checkpoint = null;
    this.uploadId = '';
  }

  _fingerprint(file, title, {
    userid,
    cataid
  }) {
    return `polyv-${userid}-${cataid}-${title}-${file.type}-${file.size}`;
  }

  _getPartSize(fileSize) {
    var partSize;
    if (fileSize <= 2 * 1024 * 1024 * 1024) {
      partSize = 2 * 1024 * 1024;
    } else if (fileSize <= 5 * 1024 * 1024 * 1024) {
      partSize = Math.ceil(fileSize / 2000);
    } else if (fileSize <= 10 * 1024 * 1024 * 1024) {
      partSize = Math.ceil(fileSize / 4000);
    } else if (fileSize <= 20 * 1024 * 1024 * 1024) {
      partSize = Math.ceil(fileSize / 8000);
    } else if (fileSize <= 30 * 1024 * 1024 * 1024) {
      partSize = Math.ceil(fileSize / 10000);
    }
    return partSize;
  }

  _getCheckpoint(fingerprint) {
    var checkpoint = localStorage.getItem(fingerprint);
    checkpoint = typeof checkpoint === 'string' ? JSON.parse(checkpoint) : null;
    return checkpoint;
  }

  _setCheckpoint(fingerprint, checkpoint) {
    let result = false;
    try {
      result = localStorage.setItem(fingerprint, JSON.stringify(checkpoint));
    } catch (e) {
      // most likely quota exceeded error
    }
    return result;
  }

  _emitStartPartUpload(partNo) {
    return done => {
      this.startUploadPartNum = partNo;

      done();
    };
  }
  _emitProgress(percentage, checkpoint) {
    if (checkpoint) {
      if (checkpoint.doneParts.length <= this.lastPartNum) {
        return;
      } else {
        this.lastPartNum = checkpoint.doneParts.length;
      }
    }
    if (!checkpoint && typeof this.progress === 'function') {
      this.progress(percentage, checkpoint);
      return;
    }
    return done => {
      if (typeof this.progress === 'function') {
        this.progress(percentage, checkpoint);
      }
      this.uploadId = checkpoint.uploadId;
      this._setCheckpoint(this.fileData.fingerprint, checkpoint);

      // 放在设置localStorage的后面
      this.finishUploadPartNum = checkpoint.doneParts.length - 1;

      if (this.hangMultipartUpload && this.startUploadPartNum === this.finishUploadPartNum) {
        this._multipartUpload();
        this.hangMultipartUpload = false;
      }

      done();
    };
  }
  _emitFail(err) {
    this.fail && this.fail(err);
  }
  _emitComplete() {
    if (typeof this.done === 'function') {
      this.done(this.fileData.vid);
    }
  }
}
