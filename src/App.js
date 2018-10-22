import './base.scss';

import React, {
  Component
} from 'react';
// import ReactDom from 'react-dom';

import Tabs from './components/Tabs/Tabs';
import TabPanel from './components/Tabs/TabPanel';
import SysInfo from './components/SysInfo/SysInfo';

import VideoList from './views/videoList/videoList';
import UploadList from './views/uploadList/uploadList';
import Ajax from './components/Utils/Ajax';
import Utils from './components/Utils/Utils';
let utils = new Utils();

window.userData = {
  component: 'all', // 默认
  cataid: 1, // 默认
  luping: '', // 默认
};
class App extends Component {
  constructor(props) {
    super(props);
    this.handleSysInfoClick = this.handleSysInfoClick.bind(this);

    this.state = {
      BASE_URL: {
        getVideoList: '//api.polyv.net/v2/video/{userid}/list',
        getVideoInfo: '//api.polyv.net/v2/video/{userid}/get-video-msg',
        getLatestPic: '//api.polyv.net/v2/video/{userid}/recentFirstImages',
        getCategory: '//api.polyv.net/v2/cata/{userid}/cata-info',
        getStsInfo: '//api.polyv.net/v2/aliyunoss/{userid}/init',
        getToken: '//api.polyv.net/v2/aliyunoss/{userid}/token',
        postCoverImage: '//my.polyv.net/v2/file/{userid}/coverImage', // test
        coverImage: '//api.polyv.net/v2/video/{userid}/coverImage',
        completeUpload: '//api.polyv.net/v2/aliyunoss/{userid}/completeUpload',
      },
      cataOptions: null,
      videoListIsClicked: false,
      component: 'all',
      luping: 0,
      sysInfo: '',
    };
  }

  handleSysInfoClick() {
    this.setState({
      sysInfo: '',
    });
  }

  fetchCategory() {
    let userData = window.userData;
    let url = this.state.BASE_URL.getCategory.replace('{userid}', userData.userid);

    Ajax.ajax(url, {
        data: {
          ptime: userData.ptime,
          sign: userData.sign,
          hash: userData.hash,
          cataid: userData.cataid || 1,
          compatible: 1,
        }
      })
      .then(res => {
        if (res.status !== 'success') {
          this.setState({
            sysInfo: '获取分类信息失败，失败信息：' + res.message,
          });
        }
        let data = res.data;
        let options = {};
        if (userData.cataid.toString() === '1') {
          options[1] = '默认分类';
        }
        if (!(data instanceof Array) || !data[0]) { // 避免data为非数组或为空数组
          window.userData.catatree = '1';
          return;
        }

        let tempArr = data[0].catatree.match(/,/g);
        if (tempArr) {
          var minLen = tempArr.length - 1;
          data.forEach(ele => {
            let level = ele.catatree.match(/,/g).length - 1 - minLen;
            let levelStr = '';
            for (let i = 0, len = level; i < len; i++) {
              levelStr += '-- ';
            }

            options[ele.cataid] = levelStr + ele.cataname;
          });
        }

        window.userData.catatree = window.userData.cataid ? data[0].catatree : '1';

        this.setState({
          cataOptions: options,
        });
      })
      .catch(() => {
        this.setState({
          sysInfo: '获取分类信息失败，请检查你的网络。',
        });
      });
  }
  fetchStsInfo() {
    if (!window.userData.userid) {
      return;
    }
    let userData = window.userData;
    let url = this.state.BASE_URL.getStsInfo.replace('{userid}', userData.userid);
    Ajax.ajax(url, {
        method: 'POST',
        data: {
          ptime: userData.ptime,
          sign: userData.sign,
        }
      })
      .then(res => {
        if (res.status !== 'success') {
          this.setState({
            sysInfo: '获取STS授权信息失败，失败信息：' + res.message,
          });
        }
      })
      .catch(() => {
        this.setState({
          sysInfo: '获取STS授权信息失败，请刷新重试！',
        });
      });
  }

  componentDidMount() {
    utils.addHander(window, 'message', event => {
      let dataStr = event.data,
        data = typeof dataStr === 'string' && JSON.parse(dataStr);
      if (!data || data.source !== 'polyv-upload') {
        return;
      }
      delete data.source;

      Object.assign(window.userData, data);
      window.userData.ptime = data.ts;
      // console.log(data);

      if (data.component && data.component !== 'all') {
        this.setState({
          component: data.component,
          videoListIsClicked: data.component === 'videoList',
          luping: data.luping || 0,
        });
      } else {
        this.setState({
          luping: data.luping || 0,
        });
      }

      if (!this.state.cataOptions) {
        this.fetchCategory();
      }
    });
  }

  render() {
    let {
      BASE_URL,
      cataOptions,
      videoListIsClicked,
      component,
      luping,
      sysInfo,
    } = this.state;

    let sysInfoVisiable = !!sysInfo;

    let publicProps = {
      BASE_URL,
    };
    let uploadListPorps = {
      cataOptions,
      luping,
    };
    let videoListPorps = {
      videoListIsClicked,
      onListChange: () => {
        let videoListIsClicked = false;
        this.setState({
          videoListIsClicked,
        });
      }
    };
    let tabsProps = {
      defaultActiveIndex: 0,
      onChange: options => {
        this.setState({
          videoListIsClicked: options.activeIndex === 1
        });
      }
    };

    if (component === 'videoList') {
      return (
        <VideoList style={{'paddingTop': '30px'}} {...publicProps} {...videoListPorps}/>
      );
    } else if (component === 'uploadList') {
      return (
        <div>
                    <UploadList style={{'paddingTop': '30px'}} {...publicProps} {...uploadListPorps} />
                    <SysInfo visible={sysInfoVisiable} sysInfo={sysInfo} onClick={this.handleSysInfoClick} />
                </div>
      );
    } else {
      return (
        <div>
                    <Tabs {...tabsProps} >
                        <TabPanel order="0" tab={'上传列表'}>
                            <UploadList {...publicProps} {...uploadListPorps} />
                        </TabPanel>
                        <TabPanel order="1" tab={'视频列表'}>
                            <VideoList {...publicProps} {...videoListPorps}/>
                        </TabPanel>
                    </Tabs>
                    <SysInfo visible={sysInfoVisiable} sysInfo={sysInfo} onClick={this.handleSysInfoClick} />
                </div>
      );
    }
  }
}

export default App;
