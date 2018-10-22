export default class Utils {
  sendMsg({
    type,
    data,
    url
  }) {
    var msgData = {
      type: type,
      data: data,
    };
    if (!url) {
      url = '*';
    }
    window.parent.postMessage(JSON.stringify(msgData), url);
  }

  addHander(ele, type, handler) {
    if (ele.addEventListener) {
      ele.addEventListener(type, handler, false);
    } else if (ele.attachEvent) {
      ele.attachEvent(`on${type}`, handler);
    } else {
      ele[`on${type}`] = handler;
    }
  }

  transformSize(bytes) {
    let bt = parseInt(bytes);
    let result;
    if (bt === 0) {
      result = '0B';
    } else {
      let k = 1024;
      let sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      let i = Math.floor(Math.log(bt) / Math.log(k));
      if (typeof i !== 'number') {
        result = '-';
      } else {
        result = (bt / Math.pow(k, i)).toFixed(2) + sizes[i];
      }
    }
    return result;
  }

  transformStatus(statusCode) {
    let status;
    switch (statusCode) {
      case '60':
        status = '已发布';
        break;
      case '61':
        status = '已发布';
        break;
      case '10':
        status = '等待编码';
        break;
      case '20':
        status = '正在编码';
        break;
      case '40':
        status = '编码失败';
        break;
      case '41':
        status = '已删除';
        break;
      case '50':
        status = '等待审核';
        break;
      case '51':
        status = '审核不通过';
        break;
      case '5':
        status = '上传中';
        break;
      default:
        status = '已删除';
    }
    return status;
  }

  uploadPic(file, options) {
    const OSS = require('ali-oss');
    let ossClient = new OSS.Wrapper(options.stsInfo);
    ossClient.put(file.name, file)
      .then((res) => {
        // console.log('图片上传成功');
        // console.log(res);
        options.done(res);
      }).catch(function(err) {
        console.log(err);
        options.fail(err);
      });
  }
}