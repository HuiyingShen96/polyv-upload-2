var $ = window.$;
$(function() {
    var location = window.location;
    var plupload = window.plupload;
    var polyvVideo = window.polyvVideo;

    var ossUrl = location.protocol + '//polyvupload.oss-cn-shenzhen.aliyuncs.com/';
    // var urlPrefix = location.protocol + '//beta.polyv.net/file/plug-in-v2';
    // var urlPrefix = location.protocol + '//localhost:8088/polyv-file/plug-in-v2';
    var urlPrefix = location.protocol + '//playertest.polyv.net/player2/huiying/plug-in-v2';
    var flash_swf_url = urlPrefix + '/upload-flash/lib/plupload-2.3.1/Moxie.swf';
    var silverlight_xap_url = urlPrefix + '/upload-flash/lib/plupload-2.3.1/Moxie.xap';

    // 用于计算上传速度
    var tmp_loaded = 0;
    var speedTimer = null;

    var changeSize = function(bytes) {
        var bt = parseInt(bytes);
        var result;
        if (bt === 0) {
            result = "0B";
        } else {
            var k = 1024;
            sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            i = Math.floor(Math.log(bt) / Math.log(k));
            result = (bt / Math.pow(k, i)).toFixed(2) + sizes[i];
        }
        return result;
    };
    var getReadableBytes = function(bytes) {
        if (undefined == bytes || 0 >= bytes || isNaN(bytes)) return '0 Bytes/S';
        var k = 1024;
        var units = ['Bytes/S', 'KB/S', 'MB/S', 'GB/S'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        var speed = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
        if (isNaN(speed)) {
            return '0 Bytes/S';
        }
        return speed + ' ' + units[i];
    };
    var getParam = function(data) {
        var tempStr = '';
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                tempStr += '&' + key + '=' + data[key];
            }
        }
        tempStr = tempStr.slice(1);
        return encodeURI(tempStr);
    };

    var initFileList = function() {
        $('#files-list').empty();
        $('#speed').hide();
        $("#cls").removeAttr("disabled");
        $("#cls-icon").removeAttr("disabled");
        $("#tag").removeAttr("disabled");
        $("#luping").removeAttr("disabled");
        $("#upload").attr("disabled", true);
        $("#pause").hide();
        $("#cover01").addClass("cover01");
    };

    var initUpload = function(fileIndex, callback) {
        var file = uploader.files[fileIndex];
        var userData = polyvVideo.userData;

        // 向用户返回文件信息
        file.filename = file.name;
        file.filesize = file.size;
        file.filetype = file.type;
        file.desc = '';
        var title = $("#" + file.id + " .inp p").text(),
            tag = $("#tag").val(),
            desc = $("#" + file.id + " textarea").val(),
            cataid = $("#cls").attr("data-cataid") || userData.cataid || 1;
        file.title = title;
        file.tag = tag;
        file.desc = desc;
        file.cataid = cataid;

        var url = "//api.polyv.net/v2/aliyunoss/direct/" + userData.userid + "/init";
        var keepsource = 0;
        if (userData.extra) {
            var extra = JSON.parse(userData.extra);
            if (extra.keepsource) {
                keepsource = extra.keepsource;
            }
        }
        var data = {
            ptime: userData.ptime,
            sign: userData.sign,
            hash: userData.hash,
            title: file.title,
            describ: file.desc,
            cataid: file.cataid,
            tag: file.tag,
            luping: document.getElementById('luping').checked ? '1' : '0',
            filesize: file.size,
            keepsource: keepsource,
            uploadType: 'plugin_aliyun',
            compatible: 1,
        };
        var tempStr = getParam(data);
        url += '?' + tempStr;

        $.ajax({
            type: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            dataType: 'json', // 使用xdr插件时一定要加上
        }).done(function(data) {
            // console.log('获取直传信息 ', JSON.stringify(data));

            if (data.status !== 'success') {
                return;
            }
            data = data.data;
            var dir = data.dir;

            if (file.size > data.remainSpace) {
                $("#upload").attr("disabled", true);
                $("#cover01").addClass("cover01");
                polyvVideo.log('您的剩余空间不足，请及时联系客服升级空间');
                return;
            }

            var key = dir + data.videoPoolId + /\.\w+$/.exec(file.name)[0];
            file.key = key;

            var multipart_params = {
                policy: data.policy,
                OSSAccessKeyId: data.accessid,
                success_action_status: '200', //让服务端返回200,不然，默认会返回204
                signature: data.signature,
                key: key,
            };

            uploader.setOption({
                url: location.protocol + '//' + data.domain,
                multipart_params: multipart_params
            });
            file.videoPoolId = data.videoPoolId;
            file.vid = file.videoPoolId;

            uploader.files[fileIndex] = file;

            if (typeof(callback) === 'function') {
                callback();
            }
        }).fail(function(err) {
            console.log('获取直传信息 err：', JSON.stringify(err));
        });
    };
    var completeUpload = function(postUrl, isLastVideo) {
        $.ajax({
            type: 'POST',
            url: postUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            dataType: 'json', // 使用xdr插件时一定要加上
        }).done(function(res) {
            // console.log('上传成功后的回调：', JSON.stringify(res));
            if (isLastVideo) {
                if (speedTimer) {
                    clearInterval(speedTimer);
                    speedTimer = null;
                }
                $("#cls").removeAttr("disabled");
                $("#cls-icon").removeAttr("disabled");
                $("#tag").removeAttr("disabled");
                $("#luping").removeAttr("disabled");
                $("#upload").attr("disabled", true);
                $("#pause").hide();
                $("#cover01").addClass("cover01");
                $("#speed").html("上传完毕！");
            }
        }).fail(function(err) {
            console.log('上传成功后的回调：(提交数据失败)', JSON.stringify(err));
        });
    };

    var startUpload = function() {
        if (uploader) {
            uploader.start();
        }
        if (!speedTimer && uploader) {
            speedTimer = setInterval(function() {
                var speed = uploader.total.bytesPerSec;
                var now_loaded = uploader.total.loaded;
                if (now_loaded === tmp_loaded) {
                    speed = 0;
                }
                tmp_loaded = now_loaded;
                $('#speed').text(getReadableBytes(speed));
            }, 500);
        }
    };
    var stopUpload = function() {
        if (speedTimer) {
            clearInterval(speedTimer);
            speedTimer = null;
        }
        if (uploader) {
            uploader.stop();
        }
    };

    var uploader = new plupload.Uploader({
        browse_button: 'file_upload',
        url: ossUrl,

        filters: {
            max_file_size: '2048mb', // mark
            mime_types: [{
                title: "Video files",
                extensions: "avi,f4v,mpg,mp4,flv,wmv,mov,3gp,rmvb,mkv,asf,264,ts,mts,dat,vob,mp3,wav,m4v,webm,mod"
            }],
            prevent_duplicates: true,
        },

        runtimes: 'html5,flash,silverlight,html4',
        flash_swf_url: flash_swf_url,
        silverlight_xap_url: silverlight_xap_url,
    });
    window.uploader = uploader;

    uploader.bind('Init', function(up) {
        console.log('Init ', up.runtime);
    });
    uploader.bind('PostInit', function(up) {
        // plupload插件初始化成功后才允许点击“选择文件”的按钮
        $('#file_upload').removeAttr('disabled');
        $('#choose').removeClass('disabled');

        // 用户点击“上传”
        $("#upload").click(function() {
            var files = up.files;
            if (!files || files.length <= 0) {
                return;
            }
            // 初始化未上传列表中的首个视频，请求成功后开始上传
            var nextIndex = -1;
            var files = uploader.files;
            for (var i = 0, len = files.length; i < len; i++) {
                if (files[i].percent !== 100) {
                    nextIndex = i;
                    break;
                }
            }
            if (nextIndex >= 0) {
                initUpload(nextIndex, function() {
                    startUpload();
                    $("#cover01").addClass("cover01");
                });
            }
        });
    });
    uploader.bind('FilesAdded', function(up, files) {
        var userData = polyvVideo.userData;
        var fileLimit = userData.fileLimit;
        var fileLimitTips = userData.fileLimitTips;

        $('#empty').removeClass('disabled');
        var placeholder = polyvVideo.userData.defaultDescPlaceholder;
        var tempHtml = '<tr id="${fileID}" class="queue-item">' +
            '<td spellcheck="false" rowspan="1" class="titledes inp"><p>${fileName}</p><input type="text" class="form-control"></td>' +
            '<td><textarea class="form-control" rows="2" placeholder="' + placeholder + '" spellcheck="false"></textarea></td>' +
            '<td class="progress-wrap"><p><span class="file-size">${fileSize} / ${fileType}</span></p><div class="progress"><div class="progress-bar progress-bar-success progress-bar-striped active progress-bar" style="width: 0%"></div></div></td>' +
            '<td class="bar" data-fileId = ${fileID}>' +
            '<a data-fileid="${fileID}" class="btn btn-danger delete"><i class="glyphicon glyphicon-trash"></i></a></td>' +
            '</tr>';
        var instanceHtml = tempHtml;
        var $fileList = $('#files-list');
        $.each(files, function(i, file) {
            if (fileLimit && file.size > fileLimit) {
                polyvVideo.log(fileLimitTips);
                return;
            }
            file.filename = file.name;
            file.filesize = file.size;
            file.filetype = file.type;
            file.desc = '';
            file.title = file.name.replace(/\.\w+$/, '');

            // 将上传列表的数据显示到界面
            var fileName = file.name.replace(/\.\w+$/, '');
            var fileSize = file.size ? changeSize(file.size) : 0;
            var fileType = file.type.split('/')[1];
            var fileId = file.id;
            instanceHtml = tempHtml.replace(/\${fileID}/g, fileId)
                .replace(/\${fileName}/g, fileName)
                .replace(/\${fileType}/g, fileType);
            if (fileSize === 0) {
                instanceHtml = instanceHtml.replace('${fileSize} /', '');
            } else {
                instanceHtml = instanceHtml.replace(/\${fileSize}/g, fileSize);
            }
            $fileList.append($(instanceHtml));

            // 将file从上传列表中删去
            $('#' + fileId + ' .delete').on('click', function(e) {
                $('#' + fileId).remove();
                uploader.removeFile(file);
                file.filename = file.name;
                file.filesize = file.size;
                file.filetype = file.type;

                e.preventDefault();
            });
        });

        // 允许点击“上传”按钮
        $("#upload").removeAttr('disabled');
        $("#cover01").removeClass("cover01");
    });
    uploader.bind('QueueChanged', function(up) {
        if (up.files.length > 0) {
            return;
        }
        initFileList();
    });
    uploader.bind('BeforeUpload', function(up, file) {
        // 处理UI
        $("#pause").show().removeClass("pause").html('<i class="glyphicon glyphicon-pause"></i><span>暂停</span>');
        $("#upload").attr("disabled", "disabled");
        $("#cls").attr("disabled", "disabled");
        $("#cls-icon").attr("disabled", "disabled");
        $("#luping").attr("disabled", "disabled");
        $("#" + file.id + " .inp").removeClass('titledes');
        $("#tag").attr("disabled", "disabled");
        $("#" + file.id + " textarea").attr("disabled", "disabled");
        $("#speed").show();
    });
    uploader.bind('UploadProgress', function(up, file) {
        // console.log('当前文件上传进度： ', file.percent);

        // 显示当前文件上传进度
        $('#' + file.id + ' .progress-bar').css('width', file.percent + '%');
        if (file.percent === 100) {
            $('#' + file.id + ' .progress-bar').data('finished', '1');
        }
    });
    uploader.bind('FileUploaded', function(up, file, info) {
        // console.log('info: ', JSON.stringify(info));
        var userData = polyvVideo.userData;

        // 处理错误情况
        if (info.status !== 200) {
            polyvVideo.log("失败，请检查网络情况。");
            return;
        }

        // 向用户返回文件信息
        file.filename = file.name;
        file.filesize = file.size;
        file.filetype = file.type;
        var res = {
            data: file,
            type: 'FILE_COMPLETE'
        };
        window.parent.postMessage(JSON.stringify(res), userData.url);

        // 是否为上传列表的最后一个文件
        var isLastVideo = up.files[up.files.length - 1].percent > 0;

        // 向后台发起completeUpload请求
        var postUrl = location.protocol + '//api.polyv.net/v2/aliyunoss/' + userData.userid + '/completeUpload';
        var data = {
            ptime: userData.ptime,
            sign: userData.sign,
            hash: userData.hash,
            object: ossUrl + file.key,
            vid: file.vid,
            compatible: 1,
        };
        var tempStr = getParam(data);
        postUrl += '?' + tempStr;
        completeUpload(postUrl, isLastVideo);

        // 对下一个文件做初始化
        if (!isLastVideo) {
            var nextIndex = -1;
            var files = uploader.files;
            for (var i = 0, len = files.length; i < len; i++) {
                if (files[i].id === file.id) {
                    nextIndex = i + 1;
                    break;
                }
            }
            if (nextIndex > 0) { // nextIndex不可能为0
                stopUpload();
                initUpload(nextIndex, function() {
                    startUpload();
                });
            }
        }

        // UI显示视频已上传
        var fileId = file.id;
        $("#" + fileId + " .progress-bar").removeClass("active");
        $("#" + fileId + " .bar").html("<i class='glyphicon glyphicon-ok ok'></i>");
    });
    uploader.bind('UploadComplete', function(up, files) {
        // console.log('UploadComplete,up: ', JSON.stringify(up));
    });
    uploader.bind('Error', function(up, err) {
        console.log('Error： ', JSON.stringify(err));
        if (speedTimer) {
            clearInterval(speedTimer);
            speedTimer = null;
        }
        if (err.code == -200) {
            polyvVideo.log("失败，请检查网络情况。");
        } else if (err.code == -500) {
            polyvVideo.log("失败，请检查是否已安装Flash。");
        } else if (err.code == plupload.FILE_SIZE_ERROR) {
            polyvVideo.log("上传的视频中包含超过2G大小限制的文件，web后台暂不支持该类文件的上传。");
        } else {
            polyvVideo.log("失败，请刷新重试。");
        }
    });

    // 清空上传列表
    $('#empty').on('click', function() {
        if (uploader.files.length <= 0) {
            return;
        }
        var r = confirm('确认清空上传列表？');
        if (r) {
            while (uploader.files.length) {
                uploader.removeFile(uploader.files[0].id);
            }
            $('#empty').addClass('disabled');
            initFileList();
        }
    });
    // 修改文件名称及描述
    $('#files-list').on('dblclick', '.titledes', function() {
        var des = $(this).find('p');
        var inp = $(this).find('input');
        des.hide();
        inp.show().val(des.text()).focus();
        inp.blur(function() {
            var val = $.trim(inp.val());
            $(this).hide();

            if (!val == '') {
                des.show().html(inp.val());
            } else {
                des.show();
            }
        });
    });
});
