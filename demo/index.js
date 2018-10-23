window.onload = function() {
  var autoRefresh = true; // 是否自动刷新
  var obj = {
    uploadButtton: 'upload',

    // component: 'uploadList', //（可选参数）'videoList' 'uploadList' 'all' 默认为'all'
    // cataid: 1526286608596, //（可选参数）分类一
    // cataid: 1, //（可选参数）默认为1
    luping: 1, //（可选参数）默认为0
    // extra: {
    //     keepsource: 1, //（可选参数）
    // },
    // fileLimit: 2 * 1024 * 1024, //（可选参数）文件大小限制
    // fileLimitTips: '不能超过2M', //（可选参数）超出文件大小限制的提示语

    // width: 300, //（可选参数）插件宽，最小值为900
    // height: 200, //（可选参数）插件高，最小值为400

    response: function(data) {
      console.log('该视频信息如下：');
      console.log(data);

      document.getElementById('videoInfo').innerHTML = JSON.stringify(data);

      upload.closeWrap();
    },
    uploadSuccess: function(fileData) {
      console.log('上传完毕！ 上传成功的文件：');
      console.log(JSON.stringify(fileData));
    },
    uploadFail: function(err) {
      console.log('上传失败，失败原因：', err.data);
    },
  };

  var upload = null;
  var url = '//playertest.polyv.net/huiying/upload-demo-2/getPolyvAuthorization.php';
  var PolyvUpload = window.PolyvUpload;
  var i = 1;
  
  function autoRefreshSign() {
    obj.requestUrl = url;
    upload = new PolyvUpload(obj);
  }

  function refreshSign() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url + '?id=' + encodeURI(new Date().getTime()));
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          obj.userid = data.userid;
          obj.ts = data.ts;
          obj.hash = data.hash;
          obj.sign = data.sign;
          upload = new PolyvUpload(obj);
        }
      }
    };
    xhr.send(null);

    
    setInterval(function() {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url + '?id=' + encodeURI(new Date().getTime())); // 防止IE9浏览器发起GET请求时总是返回304的问题
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            console.log('-1- ', data.ts);
            upload.update(data);
          }
        }
      };
      xhr.send(null);
      console.log('第' + (i++) + '次刷新...');
    }, 3 * 50 * 1000);
  }

  if (autoRefresh) { // 自动刷新
    autoRefreshSign(); 
  } else {
    refreshSign(); 
  }
};