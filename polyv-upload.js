/**
 * 用于向用户提供接口
 * @param {object} options 用户可以自行设置的参数
 */

export class PolyvUpload {
  constructor(options) {
    const LOCATION = window.location;
    const PROTOCOL = window.location.protocol;

    if (((!options.userid || !options.ts || !options.hash || !options.sign) && !options.requestUrl) || !options.uploadButtton) {
      throw new TypeError('缺少必选参数！');
    }
    var urlPrefix = PROTOCOL + '//v.polyv.net/file/plug-in-v2';

    this.options = {
      userid: options.userid,
      ts: options.ts, // 13位的毫秒级时间戳
      ptime: options.ts, // 13位的毫秒级时间戳
      hash: options.hash, // 是根据将ts和writeToken按照顺序拼凑起来的字符串进行MD5计算得到的值
      sign: options.sign, // 是根据将secretkey和ts按照顺序拼凑起来的字符串进行MD5计算得到的值
      component: options.component || 'all', // 可以设置为videoList（只显示视频列表）、 uploadList（只显示上传列表）、all（默认值，显示上传列表和视频列表）
      cataid: options.cataid || 1, // 上传目录id，默认值为1
      luping: (options.luping || 0) + '', // 开启视频课件优化处理，对于上传录屏类视频清晰度有所优化。可设置为0或1，默认值为0，表示不开启课件优化
      defaultTagPlaceholder: options.defaultTagPlaceholder || '标签 用" , "分隔', // 自定义标签输入框占位符
      defaultDescPlaceholder: options.defaultDescPlaceholder || '添加描述', // 自定义视频描述输入框占位符
      extra: JSON.stringify(options.extra || {}), // 可添加的属性为keepsource：源文件播放（不对源文件进行编码）。可设置为0（对源文件进行编码）或1（源文件播放）

      fileLimit: options.fileLimit, // 可上传单个视频的大小，默认不限制
      fileLimitTips: options.fileLimitTips || '该视频文件过大，请重新选择', // 超出大小限制时的提示语

      response: options.response || function() {}, // function，返回指定视频的信息时的回调函数
      openWrap: options.openWrap || function() {}, //
      uploadSuccess: options.uploadSuccess || function() {}, // function，当前文件上传完毕时触发的回调函数
      uploadFail: options.uploadFail || function() {}, // function，当前文件上传失败时触发的回调函数
      url: LOCATION.href,
      urlPrefix: urlPrefix,
      source: 'polyv-upload',
    };

    this.uploadButton = document.getElementById(options.uploadButtton);
    this.width = options.width ? (options.width < 900 ? 900 : options.width) : 1000; // 弹框的宽，最小900px；默认值1000px
    this.height = options.height ? (options.height < 500 ? 500 : options.height) : 600; // 弹框的高，最小500px；默认值600px
    this.requestUrl = options.requestUrl;

    // 默认使用HTML5方式上传
    // this.url = urlPrefix + '/upload-html5/build/index.html';
    this.url = PROTOCOL + '//playertest.polyv.net/player2/huiying/build/index.html';
    // this.url = PROTOCOL + '//localhost:3000';

    // 测试flash版
    // this.url = urlPrefix + '/upload-flash/index.html';

    this._init();
  }

  _addHander(ele, type, handler) {
    if (ele.addEventListener) {
      ele.addEventListener(type, handler, false);
    } else if (ele.attachEvent) {
      ele.attachEvent('on' + type, handler);
    } else {
      ele['on' + type] = handler;
    }
  }

  _checkH5Support() {
    var input = document.createElement('input');
    var fileSupport = !!(window.File && window.FileList);
    var xhr = new XMLHttpRequest();
    var fd = !!window.FormData;
    return 'multiple' in input && fileSupport && 'onprogress' in xhr && 'upload' in xhr && fd;
  }

  _init() {
    // if (!this._checkH5Support()) { // 不支持HTML5新特性时使用flash上传；需要带网络协议
    //   this.url = this.options.urlPrefix + '/upload-flash/index.html';
    // }

    this._addHander(this.uploadButton, 'click', () => {
      this.openWrap();
    });

    this._addHander(window, 'message', this._receiveMsg.bind(this));

    let i = 0;
    if (this.requestUrl) {
      this._getSign({
        success: (res) => {
          this._initIframe(() => {
            this.update(res);
            console.log('(插件内部)第' + (i++) + '次刷新...');
          });
        },
      });

      setInterval(() => {
        this._getSign({
          success: (res) => {
            this.update(res);
            console.log('(插件内部)第' + (i++) + '次刷新...');
          }
        });
      }, 3 * 50 * 1000);
    } else {
      this._initIframe();
    }
  }

  _getSign({ success, fail }) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.requestUrl + '?id=' + encodeURI(new Date().getTime())); // 防止IE9浏览器发起GET请求时总是返回304的问题
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 && typeof success === 'function') {
          success(JSON.parse(xhr.responseText));
        } else if (typeof fail === 'function') {
          fail(JSON.parse(xhr.responseText));
        }
      }
    };
    xhr.send(null);
  }

  _initIframe(callbackFun) {
    const iframe = this._createIframe();
    this.frameMsg = iframe.contentWindow;

    if (typeof callbackFun === 'function') {
      callbackFun();
    }

    function loadIframe(iframe) {
      if (iframe.readyState && iframe.readyState !== 'complete') {
        return;
      } else {
        this.update();
      }
    };

    if (iframe.attachEvent) {
      iframe.attachEvent("onload", loadIframe.bind(this, iframe));
    } else {
      iframe.onload = loadIframe.bind(this, iframe);
    }
  }

  _createIframe() {
    var wrapAll = document.createElement('div'),
      wrap = document.createElement('div'),
      frameWrap = document.createElement('div'),
      cancle = document.createElement('span'),
      iframe = document.createElement('iframe');
    wrapAll.setAttribute('id', 'polyv-wrapAll');
    wrapAll.style.display = 'none';
    wrap.style.cssText = 'display: block;position: fixed;left: 0;top: 0;width: 100%;height: 100%;z-index: 1001;background-color: #000;-moz-opacity: 0.5;opacity: .50;filter: alpha(opacity=50);';
    frameWrap.style.cssText = `display: block;position: fixed;left: 0;top: 0;bottom: 0;right: 0;width: ${this.width}px;height: ${this.height}px;margin: auto;z-index: 1002;box-shadow: 0 0 25px rgba(0,0,0,0.7);border-radius: 10px;`;
    cancle.innerHTML = '&times;';
    cancle.style.cssText = 'width: 26px;height: 26px;position: absolute;top: 0px;right: 0px;cursor: pointer;background: #eee;text-align: center;line-height: 26px;color: #666;font-size: 16px;font-family: microsoft yahei;border-radius: 0 10px 0 0;';
    cancle.onclick = function() {
      wrapAll.style.display = 'none';
    };
    iframe.setAttribute('src', this.url);
    iframe.setAttribute('id', 'polyv-iframe');
    iframe.setAttribute('width', this.width);
    iframe.setAttribute('height', this.height);
    iframe.style.cssText = 'width: 100%;height: 100%;z-index: 1002;border:none;border-radius: 10px;background-color: #fff;';
    frameWrap.appendChild(iframe);
    frameWrap.appendChild(cancle);
    wrapAll.appendChild(wrap);
    wrapAll.appendChild(frameWrap);
    document.getElementsByTagName('body')[0].appendChild(wrapAll);
    return iframe;
  }

  _receiveMsg(event) {
    console.log(event);
    var msgData = JSON.parse(event.data);
    switch (msgData.type) {
      case 'VIDEO_INFO':
        if (typeof this.options.response === 'function') {
          this.options.response(msgData.data);
        }
        break;
      case 'FILE_COMPLETE':
        if (typeof this.options.uploadSuccess === 'function') {
          this.options.uploadSuccess(msgData.data);
        }
        break;
      case 'FILE_FAIL':
        if (typeof this.options.uploadFail === 'function') {
          this.options.uploadFail(msgData.data);
        }
        break;
      default:
        break;
    }
  }

  // 用于更新上传参数
  update() {
    if (typeof arguments[0] === 'object') {
      for (var i in arguments[0]) {
        if (arguments[0].hasOwnProperty(i)) {
          this.options[i] = arguments[0][i];
        }
      }
      if (arguments[0].ts) {
        this.options.ptime = arguments[0].ts;
      }
    }
    this.frameMsg.postMessage(JSON.stringify(this.options), this.url);
  }

  // 关闭插件
  openWrap() {
    this.frameMsg.postMessage(JSON.stringify({
      openWrap: true
    }), this.url);
    this.options.openWrap && this.options.openWrap();
    document.getElementById('polyv-wrapAll').style.display = 'block';
  }

  // 打开插件
  closeWrap() {
    document.getElementById('polyv-wrapAll').style.display = 'none';
  }
}

