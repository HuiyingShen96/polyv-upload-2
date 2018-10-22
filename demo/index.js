window.onload = function() {
  var upload = null;

  var url = '//playertest.polyv.net/huiying/upload-demo-2/getPolyvAuthorization.php';
  var PolyvUpload = window.PolyvUpload;

  // var obj = {
  //   uploadButtton: 'upload',

  //   component: 'uploadList', // 'videoList' / 'uploadList'/'all'
  //   // cataid: 1526286608596, // 分类一
  //   // cataid: 1,
  //   luping: 1,
  //   // extra: {
  //   //     keepsource: 1,
  //   // },
  //   fileLimit: 2 * 1024 * 1024,
  //   fileLimitTips: '不能超过2M',

  //   width: 300,
  //   height: 200,

  //   requestUrl: url,

  //   response: function(data) {
  //     console.log('该视频信息如下：');
  //     console.log(data);

  //     document.getElementById('videoInfo').innerHTML = JSON.stringify(data);

  //     upload.closeWrap();
  //   },
  //   uploadSuccess: function(fileData) {
  //     console.log('上传完毕！ 上传成功的文件：');
  //     console.log(JSON.stringify(fileData));
  //   },
  //   uploadFail: function(err) {
  //     console.log('上传失败，失败原因：', err.data);
  //   },
  // };
  // upload = new PolyvUpload(obj);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '?id=' + encodeURI(new Date().getTime()));
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        var obj = {
          uploadButtton: 'upload',
          userid: data.userid,
          ts: data.ts,
          hash: data.hash,
          sign: data.sign,

          // component: 'uploadList', // 'videoList' / 'uploadList'/'all'
          // cataid: 1526286608596, // 分类一
          // cataid: 1,
          luping: 1,
          // extra: {
          //     keepsource: 1,
          // },
          fileLimit: 2 * 1024 * 1024,
          fileLimitTips: '不能超过2M',

          width: 300,
          height: 200,

          // requestUrl: url,

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
        upload = new PolyvUpload(obj);
      }
    }
  };
  xhr.send(null);

  var i = 1;
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
  }, 10 * 1000);
};