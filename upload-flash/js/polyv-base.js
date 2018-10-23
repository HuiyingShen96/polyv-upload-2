var jQuery = window.jQuery;
var $ = window.$;
jQuery.support.cors = true;

var logTimer = null;

function PolyvVideo() {
    this.URL = {
        getVideoList: '//api.polyv.net/v2/video/{userid}/list',
        getCataInfo: '//api.polyv.net/v2/cata/{userid}/cata-info',
        getVideoInfo: '//api.polyv.net/v2/video/{userid}/get-video-msg',
        getLatestPic: '//api.polyv.net/v2/video/{userid}/recentFirstImages',
        postCoverImage: '//api.polyv.net/v2/video/{userid}/coverImage',
        postCoverImage2: '//my.polyv.net/v2/file/{userid}/coverImage', // test
    };
    this.selector = {
        $tag: '#tag',

        $list: '#exist-video-list',
        $videoList: '#exist-list',
        $videoMain: '.exist-list',
        $uploadList: '#upload-list',
        $uploadMain: '.upload-list',
        $upImgForm: '#upImgForm',
        $upImg: '#upImg',
        $upPtime: '#upPtime',
        $upSign: '#upSign',
        $upHash: '#upHash',
        $upVid: '#upVid',
        $luping: '#luping',
        $cata: '#cata',
        $cataname: '#cls',
        $cataCtrl: '#btn-cls',
        $loading: '#loading',
        $pageMove: '#pageMove',
        $prePage: '#pageMove [data-pagenum="pre"]',
        $nextPage: '#pageMove [data-pagenum="next"]',
        $returnHome: '#returnHome',

        $videoDetail: '#video-detail',
        $refresh: '#refresh',
        $videoAllImg: '#video-all-img',
        $firstImg: '.first-img>img',
        $existAllImg: '#exist-all-img',
        $fileName: '#fileName',
        $searchBtn: '#search-btn',
        $searchKeyWord: '#search-video',
        $imgBtn: '#imgBtn',

        $xxxx: '#xxxx',
        $existImgBtn: '#existImgBtn',
        $returnMsg: '#returnMsg',
        $selected: '#selected',
        $chosen: '#chosen',

        $submitBtn: '#submitBtn',

        $vtitle: '#vtitle',
        $vsrc: '#vsrc',
        $vvid: '#vvid',
        $vtime: '#vtime',
        $vduration: '#vduration',
    };
    this.fileData = {
        tag: '',
    };
    this.status = {
        pageNum: 1,
        search: false,
    };
    this.userData = {
        luping: ''
    };
    this.el = {};
};
PolyvVideo.prototype = {
    constructor: PolyvVideo,
    init: function() {
        var self = this;

        this.getElements.call(this);


        this.addHander(window, 'message', function(event) {
            var options = $.parseJSON(event.data);
            // 初次打开上传插件的界面时先初始化plupload插件
            if (options.hasOwnProperty('openWrap')) {
                if (options.openWrap && window.uploader && !uploader.runtime) {
                    uploader.init();
                }
                return;
            }
            var el = self.el;
            if (!self.userData.luping && options.luping && options.luping.toString() === '1') { // 在对userData重新赋值前做这一步
                el.$luping.attr('checked', true);
            }
            for (var key in options) {
                if (options[key]) {
                    self.userData[key] = options[key];
                }
            }
            // console.log(self.userData);

            self.getUrl.call(self);
            self.initUpImgForm.call(self);
            self.showComponent.call(self);
            self.fetchCata.call(self);

            var userData = self.userData;
            
            el.$tag.attr('placeholder', userData.defaultTagPlaceholder);
            
        });

        var el = this.el;
        var userData = self.userData;
        el.$luping.on('change', function() {
            self.userData.luping = this.checked ? '1' : '0';
        });
        el.$uploadList.on('click', function() {
            $(this).addClass("label-primary").removeClass("label-default");
            el.$videoList.addClass("label-default").removeClass("label-primary");
            el.$videoMain.fadeOut();
            el.$uploadMain.fadeIn();
        });
        el.$videoList.on('click', function() {
            $(this).addClass("label-primary").removeClass("label-default");
            el.$uploadList.addClass("label-default").removeClass("label-primary");
            el.$list.empty();
            el.$uploadMain.fadeOut();
            el.$videoMain.fadeIn();
            el.$pageMove.show();
            self.status.pageNum = 1;
            self.fetchVideoList(1);
            el.$videoDetail.fadeOut();
            el.$returnHome.fadeOut();
        });
        el.$cata.on('click', 'a', function() {
            // debugger;
            var $this = $(this).eq(0);
            var cataname = $this.data('cataname');
            el.$cataname.text(cataname).attr('data-cataid', $this.data('cataid'));
            el.$cata.hide(100);
        });
        el.$cataCtrl.on('click', function() {
            // debugger;
            var disabled = el.$cataname.attr('disabled');
            if (disabled) return;
            el.$cata.toggle();
        });
        $(document).on('click', function(e) {
            if ($(e.target).parents(self.selector.$cataCtrl).length <= 0) {
                el.$cata.css('display', 'none');
            }
        });
        el.$searchBtn.on('click', function() {
            el.$videoDetail.fadeOut();
            el.$refresh.hide();
            el.$returnHome.show();
            self.status.search = true;
            el.$loading.show();
            self.fetchVideoList(1, $.trim(el.$searchKeyWord.val()));
        });
        el.$pageMove.on('click', 'span', function() {
            el.$list.hide();
            var pn = $(this).data('pagenum');
            if (pn === 'pre') {
                if (self.status.pageNum > 1) {
                    self.status.pageNum--;
                    pn = self.status.pageNum;
                    self.fetchVideoList(pn);
                } else {
                    self.fetchVideoList(1);
                }
            } else {
                self.status.pageNum++;
                pn = self.status.pageNum;
                self.fetchVideoList(pn);
            }
        });
        el.$returnHome.on('click', function() {
            el.$videoList.click();
            el.$searchKeyWord.val('');
            el.$refresh.hide();
            self.status.search = false;
        });
        el.$list.on('click', 'tr', function() {
            var vid = $(this).data('vid');
            el.$videoDetail.attr('data-vid', vid);
            el.$upVid.val(vid);
            self.fetchVideoInfo(vid);
            
            el.$refresh.show();
            el.$imgBtn.find('span').get(0).click();
            el.$upImg.val('');
            el.$fileName.html('');
        });

        el.$videoAllImg.on('click', 'img', function() {
            var src = $(this).attr('src');
            if (src == el.$firstImg.attr('src')) {
                $(this).attr('id', 'selected');
                return;
            }
            el.$firstImg.attr('src', src).addClass('ischange').removeAttr('data-id');
            $(self.selector.$selected).removeAttr('id');
            $(self.selector.$chosen).removeAttr('id');
            $(this).attr('id', 'selected');
            el.$xxxx.html('保存');
        });
        el.$existAllImg.on('click', 'img', function() {
            var src = $(this).attr('src');
            if (src == el.$firstImg.attr('src')) {
                return;
            }
            el.$firstImg.attr('src', src).addClass('ischange').attr('data-id', $(this).data('id'));
            $(self.selector.$selected).removeAttr('id');
            $(self.selector.$chosen).removeAttr('id');
            $(this).attr('id', 'chosen');
            el.$xxxx.html('保存');
        });
        el.$imgBtn.on('click', 'span', function() {
            var dataId = $(this).data('id');
            el.$imgBtn.find('span').addClass('label-default').removeClass('label-info');
            $(this).removeClass('label-default').addClass('label-info');
            if (dataId == 'video-all-img') {
                el.$existAllImg.hide();
                el.$videoAllImg.show();
            } else {
                el.$videoAllImg.hide();
                el.$existAllImg.show();
            }
        });

        el.$existImgBtn.on('click', function() {
            self.fetchLatestImg();
        })

        el.$xxxx.on('click', function() {
            var $this = $(this);
            var vid = el.$videoDetail.data('vid');

            // 保存封面
            var $selected = $(self.selector.$selected);
            var $chosen = $(self.selector.$chosen);
            var index = $selected.length > 0 ? $selected.prevAll("img").length : -1;
            var recentId = $chosen.length > 0 ? el.$firstImg.attr("data-id") : -1;
            if (index > -1 || recentId > -1) {
                var data = {
                    ptime: userData.ptime,
                    sign: userData.sign,
                    hash: userData.hash,
                    vid: vid,
                    compatible: 1,
                };
                if (index > -1) {
                    data.index = index
                }
                if (recentId > -1) {
                    (data.recentId = recentId);
                }
                self.postCoverImg.call(self, data);
                return;
            }

            var status = self.status;
            if (!status.search && el.$firstImg.hasClass('ischange')) {
                self.fetchVideoList(status.pageNum);
            } else if (status.search && el.$firstImg.hasClass('ischange')) {
                el.$searchBtn.click();
            }
            self.fetchVideoList(status.pageNum);
            el.$firstImg.removeClass('ischange');
            el.$videoDetail.fadeOut();
            el.$videoMain.removeClass('hideNav');
            $('.video-search, .header').show();
            el.$refresh.hide();
        });
        el.$refresh.click(function() {
            var vid = el.$videoDetail.data('vid');
            el.$upImg.val('');
            el.$fileName.html('');
            self.fetchVideoInfo.call(self, vid);
        });
        el.$returnMsg.click(function() {
            var vid = el.$videoDetail.data('vid');
            self.fetchVideoInfoAjax(vid).done(function(obj) {
                var res = {
                    data: obj.data[0],
                    type: 'VIDEO_INFO',
                };
                window.parent.postMessage(JSON.stringify(res), self.userData.url);
            });
        });

        el.$upImgForm.submit(function() {
            // debugger;
            el.$submitBtn.find('span').toggle();
            $(self.selector.$selected).removeAttr('id');
            $(self.selector.$chosen).removeAttr('id');
            var vid = el.$videoDetail.data('vid');
            self.fetchVideoInfo.call(self, vid, true);
        });
    },

    initUpImgForm: function() {
        var userData = this.userData;
        var el = this.el;

        el.$upImgForm.attr('action', this.URL.postCoverImage2);
        el.$upPtime.val(userData.ts);
        el.$upSign.val(userData.sign);
        el.$upHash.val(userData.hash);
    },

    fetchCata: function() {
        var self = this;
        var userData = this.userData;
        $.getJSON(this.URL.getCataInfo, {
            ptime: userData.ptime,
            sign: userData.sign,
            hash: userData.hash,
            cataid: userData.cataid,
            compatible: 1,
            id: encodeURI(new Date().getTime()), // IE9下用来强制从服务器获取数据
        }).done(function(res) {
            var data = res.data;
            var el = self.el;
            self.userData.catatree = (userData.cataid.toString() === '1') ? '1' : data[0].catatree;
            self.renderCata(data);
        }).fail(function(err) {
            // console.log('获取分类目录：', JSON.stringify(err));
            self.log("获取分类目录失败，请刷新页面", true);
        });
    },
    fetchVideoList: function(pageNum, keyword) {
        var self = this;
        var el = this.el;
        var userData = this.userData;
        var fileData = this.fileData;

        el.$list.empty();
        el.$loading.show();
        $.getJSON(this.URL.getVideoList, {
            ptime: userData.ptime,
            sign: userData.sign,
            hash: userData.hash,
            // numPerPage: numPerPage, // 每一页的大小，默认为99
            pageNum: pageNum || 1, // 第几页，默认为1
            keyword: keyword,
            cataid: userData.cataid,
            compatible: 1,
            tag: fileData.tag,
            id: encodeURI(new Date().getTime()), // IE9下用来强制从服务器获取数据
        }).done(function(json) {
            if (99 * self.status.pageNum < parseInt(json.message)) {
                el.$nextPage.show();
            } else {
                el.$nextPage.hide();
            }
            if (self.status.pageNum > 1) {
                el.$prePage.show();
            } else {
                el.$prePage.hide();
            }
            self.renderVideoList(json);
        });
    },
    fetchLatestImg: function() {
        var self = this;

        $.getJSON(this.URL.getLatestPic, {
            ptime: this.userData.ptime,
            sign: this.userData.sign,
            hash: this.userData.hash,
            compatible: 1,
            id: encodeURI(new Date().getTime()), // IE9下用来强制从服务器获取数据
        }).done(function(json) {
            var data = json.data;
            var imgWrap = $("#exist-all-img");
            var dom = "";
            $.each(data, function() {
                dom += "<img src=" + self.getImgUrl(this.imgurlsmall) + " data-id=" + this.id + ">";
            });
            imgWrap.html(dom);
        });
    },
    fetchVideoInfo: function(vid) {
        var param = arguments;
        var self = this;
        var userData = this.userData;
        var el = this.el;

        this.fetchVideoInfoAjax(vid).done(function(json) {
            if (json.status === 'error') {
                // console.log('selectVideo: ', json.message);
                return;
            }
            el.$videoDetail.fadeIn();
            var data = json.data[0];
            el.$xxxx.html('&times;');
            var first_image = self.getImgUrl(data.first_image);
            if (param[1]) { // 上传图片
                if (first_image === el.$firstImg.attr('src')) {
                    setTimeout(function() {
                        self.fetchVideoInfo.call(self, vid, true);
                    }, 1000);
                } else {
                    el.$firstImg.attr('src', first_image);
                    el.$submitBtn.find('span').toggle();
                    el.$xxxx.text('保存');
                }
                return;
            }
            self.renderVideoStatus(data);
            el.$firstImg.attr('src', first_image);
            el.$vtitle.text(data.title);
            el.$vsrc.text(data.swf_link);
            el.$vvid.text(data.vid);
            el.$vtime.text(data.ptime);
            el.$vduration.text(data.duration);
            var imageUrls = data.imageUrls;
            var dom = "";
            for (var i in imageUrls) {
                dom += "<img src=" + self.getImgUrl(imageUrls[i]) + ">";
            }
            el.$videoAllImg.html(dom);
            $('.video-search, .header').hide();
            el.$videoMain.addClass('hideNav');
        }).fail(function(json) {
            console.log('selectVideo: ', JSON.stringify(json));
        });
    },
    fetchVideoInfoAjax: function(vid) {
        return $.getJSON(this.URL.getVideoInfo, {
            vid: vid,
            ptime: this.userData.ptime,
            sign: this.userData.sign,
            hash: this.userData.hash,
            compatible: 1,
            id: encodeURI(new Date().getTime()), // IE9下用来强制从服务器获取数据
        });
    },

    postCoverImg: function(data) {
        var el = this.el;
        var self = this;

        $.ajax({
            type: 'POST',
            url: this.URL.postCoverImage + '?' + this.getParam(data),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            dataType: 'json', // 使用xdr插件时一定要加上
        }).done(function(res) {
            if (res.status.toUpperCase() !== 'SUCCESS') {
                self.log(res.message);
                return;
            }
            self.log('封面更换成功！');
            el.$xxxx.html('&times;');
            $(self.selector.$selected).removeAttr("id");
            $(self.selector.$chosen).removeAttr("id");
        }).fail(function() {
            self.log('封面更换失败，请刷新页面重试！');
        });
    },

    renderVideoList: function(json) {
        var $list = this.el.$list,
            dom = "";
        $list.hide();
        var self = this;
        if (json.data) {
            $(json.data).each(function(index) {
                var status = self.getStatus(this.status);
                var imgUrl = self.getImgUrl(this.first_image);
                var ele = "<tr data-vid=" + this.vid + "><td><img src=" +
                    imgUrl + " /></td><td><span class='v-title'>" +
                    this.title + "</span> <br /> " +
                    this.duration + "</td><td>" +
                    status + "</td><td> " +
                    this.formatPtime + "</td></tr>";
                dom += ele;
            });
        } else {
            dom = "<tr><td>暂无视频</td></tr>";
        }
        $list.html(dom);
        $("#loading").hide();
        $list.show();
    },
    renderCata: function(arr) {
        var el = this.el;
        var minLen = arr[0].catatree.match(/,/g).length - 1;
        var dom = '';
        $(arr).each(function(index) {
            var cataid = this.cataid,
                cataname = this.cataname,
                catatree = this.catatree;
            var level = catatree.match(/,/g).length - 1 - minLen;
            var val = "";
            for (var i = 0; i < level; i++) {
                val += "-- ";
            }
            val += cataname;
            dom += "<li><a href='javascript:;'" + " data-cataid=" + this.cataid + " data-cataname=" + this.cataname + ">" + val + "</a></li>";
        });
        dom = '<li><a href="javascript:;" data-cataid="" data-cataname="默认分类">默认分类</a></li>' + dom
        el.$cata.html(dom);

    },
    renderVideoStatus: function(json) {
        var vstatus = $("#vstatus"),
            dom = "",
            dom2 = "";
        dom += "<td>" + this.getStatus(json.status) + "</td>";
        dom += "<td>" + json.df + "</td>";
        for (var i = 0; i < 3; i++) {
            var size = mSize = "-";
            if (json.filesize[i]) {
                size = this.getSize(json.filesize[i]);
            }
            if (json["tsfilesize" + (i + 1)]) {
                mSize = this.getSize(json["tsfilesize" + (i + 1)]);
            }
            dom += "<td>" + size + "</td>";
            dom2 += "<td>" + mSize + "</td>";
        }
        vstatus.html(dom + dom2);
    },
    log: function(text, fixed) {
        if ($('#polyvLog').length > 0) {
            $('#polyvLog').html('<span>' + text + '</span>');
        } else {
            var log = $('<div id="polyvLog" />').addClass('polyv-log').html('<span>' + text + '</span>');
            $('body').append(log);
        }

        if (!fixed) {
            if (logTimer) {
                clearTimeout(logTimer);
                logTimer = null;
            }
            logTimer = setTimeout(function() {
                $('#polyvLog').remove();
                if (logTimer) {
                    clearTimeout(logTimer);
                    logTimer = null;
                }
            }, 2000);
        }
    },

    getElements: function() {
        for (var key in this.selector) {
            if (key[0] === '$' && this.selector.hasOwnProperty(key)) {
                this.el[key] = $(this.selector[key]);
            }
        }
    },
    getUrl: function() {
        for (var key in this.URL) {
            if (this.URL.hasOwnProperty(key)) {
                this.URL[key] = this.URL[key].replace('{userid}', this.userData.userid);
            }
        }
    },
    showComponent: function(componentName) {
        var el = this.el;

        switch (componentName) {
            case 'uploadList':
                el.$videoList.hide();
                el.$videoMain.hide();
                break;
            case 'videoList':
                el.$uploadList.hide();
                el.$uploadMain.hide();
                el.$videoList.click();
                break;
            case 'all':
            default:
                break;
        }
    },


    getImgUrl: function(url) {
        if (url.slice(0, 5) === '/img/') {
            return '//my.polyv.net/assets/images/videodefault.png';
        }
        if (location.protocol === 'https:' || url.slice(0, 5) !== 'https') {
            return url.slice(5);
        }
    },
    getStatus: function(statusNum) {
        var status;
        switch (statusNum) {
            case "60":
                status = "已发布";
                break;
            case "61":
                status = "已发布";
                break;
            case "10":
                status = "等待编码";
                break;
            case "20":
                status = "正在编码";
                break;
            case "40":
                status = "编码失败";
                break;
            case "50":
                status = "等待审核";
                break;
            case "51":
                status = "审核不通过";
                break;
            case "5":
                status = "上传中";
                break;
            default:
                status = "已删除"
        }
        return status;
    },
    getSize: function(bytes) {
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
    },
    getParam: function(data) {
        var tempStr = '';
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                tempStr += '&' + key + '=' + data[key];
            }
        }
        tempStr = tempStr.slice(1);
        return encodeURI(tempStr);
    },
    addHander: function(ele, type, handler) {
        if (ele.addEventListener) {
            ele.addEventListener(type, handler, false);
        } else if (ele.attachEvent) {
            ele.attachEvent("on" + type, handler);
        } else {
            ele["on" + type] = handler;
        }
    },
};
var polyvVideo = new PolyvVideo();
polyvVideo.init();
