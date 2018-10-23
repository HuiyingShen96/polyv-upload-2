import React, {
    Component
} from 'react';
import PropTypes from 'prop-types';
import './uploadList.scss';
import Select from 'components/Select/Select';
import Button from 'components/Button/Button';
import Table from 'components/Table/Table';
import UploadButton from 'components/UploadButton/UploadButton';
import Confirm from 'components/Confirm/Confirm';
import SysInfo from 'components/SysInfo/SysInfo';

import TitleTd from './titleTd';
import DescTd from './descTd';

import Utils from 'components/Utils/Utils';
import ResumableUpload from 'components/Utils/ResumableUpload';
let utils = new Utils();
let polyv = new ResumableUpload();

export default class UploadList extends Component {
    constructor(props) {
        super(props);

        this.handleUploadBtnChange = this.handleUploadBtnChange.bind(this);
        this.handleTagChange = this.handleTagChange.bind(this);
        this.handleLupingChange = this.handleLupingChange.bind(this);
        this.handleEmptyClick = this.handleEmptyClick.bind(this);
        this.handlePauseClick = this.handlePauseClick.bind(this);
        this.handleUploadClick = this.handleUploadClick.bind(this);
        this.handleSelectCategoryChange = this.handleSelectCategoryChange.bind(this);
        this.handleConfirmEmptyClick = this.handleConfirmEmptyClick.bind(this);
        this.handleSysInfoClick = this.handleSysInfoClick.bind(this);
        this.setSpeedTimer = this.setSpeedTimer.bind(this);

        this.state = {
            files: [],
            curIndex: 0,
            uploadStatus: 0, // 上传状态（0:等待 1:就绪 2:执行 3:暂停）
            uploadDisable: false,
            isStopping: false,
            pauseDisable: false,

            fileOptions: {
                cataid: -1,
                tag: '',
            },
            speedValue: '0 Bytes/S',
            confirmVisible: false,
            sysInfo: '',
            luping: this.props.luping,
            uploadBtnName: 'selectFiles'
        };

        this.uploadProgress = {
            lastTime: 0,
            newTime: 0,
        };
    }

    getReadableBytes(bytes) {
        if (undefined === bytes || 0 >= bytes || isNaN(bytes)) {
            return '0 Bytes/S';
        }
        var k = 1024;
        var units = ['Bytes/S', 'KB/S', 'MB/S', 'GB/S'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        var speed = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
        if (isNaN(speed)) {
            return '0 Bytes/S';
        }
        return speed + ' ' + units[i];
    }
    setSpeedTimer(checkPoint) {
        this.uploadProgress.newTime = new Date().getTime();
        let duration = this.uploadProgress.newTime - this.uploadProgress.lastTime;
        this.uploadProgress.lastTime = this.uploadProgress.newTime;
        let partSize = checkPoint.partSize;
        let bytes = partSize / duration * 1000; // 1s内的流量
        let speedValue = this.getReadableBytes(bytes);
        this.setState({
            speedValue,
        });
    }

    getTbodyData(files) {
        let tbodyData = [];

        let setFileOptions = function({
            name,
            value,
            index
        }) {
            let files = this.state.files.slice();
            if (value) {
                files[index][name] = value;
            }

            this.setState({
                files,
            });
        };

        let deleteFile = function(fileKey, disabled) {
            if (disabled) {
                return;
            }
            let files = this.state.files.slice();
            let uploadStatus = this.state.uploadStatus;

            let index = files.findIndex(ele => {
                return ele.key === fileKey;
            });

            files.splice(index, 1);
            this.resetUplodBtnValue();

            let sysInfo = '';
            if (files.length <= this.state.curIndex) {
                uploadStatus = 0;
                if (files.length > 0) {
                    sysInfo = '上传成功！';
                }
            }

            this.setState({
                sysInfo,
                files,
                uploadStatus,
            });
            if (sysInfo) {
                setTimeout(() => {
                  this.setState({
                    sysInfo: ''
                  });
                }, 2000);
            }
        };

        files.forEach((file, index) => {
            let uploadStatus = this.state.uploadStatus;
            let type = file.type.replace(/.+\//, ''),
                size = utils.transformSize(file.size);
            let uploading = (file.progress > 0),
                finished = !!file.complete;

            let disabledDelete = this.state.uploadStatus === 2;

            let progressClass = disabledDelete ? 'active progressBar' : 'progressBar';

            let fileName = (
                    <TitleTd 
                        title={file.title} 
                        uploading={uploading || uploadStatus === 2}
                        index={index} 
                        setFileOptions={setFileOptions.bind(this)} />
                ),
                description = <DescTd 
                    uploading={uploading || uploadStatus === 2}
                    index={index}
                    setFileOptions={setFileOptions.bind(this)} />,
                progress = (
                    <div>
                        <p>{size} / {type}</p>
                        <div className='progressBar-wrap'>
                            <div className={progressClass} style={{width: `${file.progress}%`}}></div>
                        </div>
                    </div>
                ),
                deleteBtn = finished ? <i className="fa fa-check" aria-hidden="true"></i> : <i className={'fa fa-trash-o ' + (disabledDelete ? 'disabled' : '')} aria-hidden="true" onClick={deleteFile.bind(this, file.key, disabledDelete)}></i>;
            tbodyData.push({
                fileName,
                description,
                progress,
                deleteBtn
            });
        });
        return tbodyData;
    }
    uploadFile(file, curIndex) {
        this.uploadProgress.lastTime = new Date().getTime();

        let progress = function(curIndex, percentage, checkPoint) {
            if (this.state.uploadStatus === 3 || this.state.isStopping) { // 暂停状态不用更新进度
                return;
            }
            if (typeof percentage !== 'number') {
                return;
            }
            let files = this.state.files.slice();
            files[curIndex].progress = parseFloat((percentage * 100).toFixed(2));

            if (checkPoint) {
                this.setSpeedTimer(checkPoint);
            }

            this.setState({
                files: files,
            });
        };

        let done = function(vid) {
            let files = this.state.files.slice();
            files[curIndex].vid = vid;
            files[curIndex].complete = true;
            utils.sendMsg({
                type: 'FILE_COMPLETE',
                data: files[curIndex],
                url: window.userData.url
            });
            curIndex++;
            let uploadStatus = this.state.uploadStatus;
            let sysInfo = '';

            if (curIndex < files.length) {
                this.uploadFile(files[curIndex], curIndex);
            } else {
                sysInfo = '上传成功！';
                uploadStatus = 0;
            }

            this.setState({
                uploadStatus,
                files,
                curIndex,
                sysInfo,
            });
            if (sysInfo) {
                setTimeout(() => {
                  this.setState({
                    sysInfo: ''
                  });
                }, 2000);
            }
        };

        let {
            cataid,
            tag
        } = this.state.fileOptions;
        cataid = cataid < 0 ? window.userData.cataid || '1' : cataid;

        let userData = window.userData;
        polyv.upload(file, {
            // stsInfo: window.stsInfo,
            url_getStsInfo: this.props.BASE_URL.getStsInfo,
            url_getToken: this.props.BASE_URL.getToken,
            url_completeUpload: this.props.BASE_URL.completeUpload,
            // 传数据到后台时需要添加在请求头的数据
            ptime: userData.ptime,
            hash: userData.hash,
            sign: userData.sign,
            userid: userData.userid,
            // 需要随视频文件地址传到后台的数据
            cataid,
            desc: file.desc,
            ext: file.type.replace(/.+\//, ''),
            extra: userData.extra,
            luping: this.state.luping,
            title: file.title,
            tag: tag,
            // 回调函数
            progress: progress.bind(this, curIndex),
            done: done.bind(this),
            fail: err => {
                if (polyv) {
                    polyv.stop();
                }
                if (err.reason === 'overSize') {
                    this.setState({
                        uploadDisable: true,
                        sysInfo: err.message,
                    });
                } else {
                    this.setState({
                        sysInfo: err.message,
                        uploadStatus: 3,
                    });
                }
                utils.sendMsg({
                    type: 'FILE_FAIL',
                    data: {
                        data: err
                    },
                    url: window.userData.url
                });
            },
            finishStop: () => {
                this.setState({
                    isStopping: false,
                    uploadStatus: 3,
                });
            },
            disabledPause: (boolean) => {
                this.setState({
                    pauseDisable: boolean,
                });
            }
        });
    }

    handleUploadBtnChange(files) {
        let addTime = Date.now();
        let uploadStatus = this.state.uploadStatus;
        let totalBytesTotal = this.state.totalBytesTotal;
        const curFiles = this.state.files;
        let newFiles = Array.from(files);
        let badFileIndexList = [];
        const { fileLimit, fileLimitTips } = window.userData;

        newFiles.forEach((file, fileIndex) => {
            let repeat = false;
            curFiles.forEach(curFile => {
                if (repeat) {
                    return;
                }
                if (curFile.name === file.name && curFile.size === file.size) {
                    repeat = true;
                }
            });
            if (repeat) {
                badFileIndexList.push(fileIndex);
            } else {
                if (fileLimit && file.size > fileLimit) {
                    badFileIndexList.push(fileIndex);
                    this.setState({
                        sysInfo: fileLimitTips,
                    });
                    setTimeout(() => {
                        this.setState({
                            sysInfo: ''
                        });
                    }, 3000);
                    return;
                }
                if (file.size > 30 * 1024 * 1024 * 1024) {
                    badFileIndexList.push(fileIndex);
                    this.setState({
                        sysInfo: '上传的视频中包含超过30G大小限制的文件，暂不支持该类文件的上传。',
                    });
                    return;
                }
                file.key = `${addTime}_${file.name}`;
                file.title = file.name.replace(/\.\w+$/, '');
                file.desc = '';
                file.progress = 0;
                file.bytesUploaded = 0;

                file.filename = file.name;
                file.filetype = file.type;
                file.filesize = file.size;

                totalBytesTotal += file.size;
            }
        });
        for (var i = badFileIndexList.length - 1; i >= 0; i--) {
            newFiles.splice(badFileIndexList[i], 1);
        }
        let concatFiles = curFiles.slice();

        concatFiles = concatFiles.concat(newFiles);

        if (newFiles.length > 0 && uploadStatus === 0) {
            uploadStatus = 1;
        }

        this.setState({
            uploadStatus,
            files: concatFiles,
            totalBytesTotal,
        });
    }
    handleTagChange(e) {
        let fileOptions = Object.assign({}, this.state.fileOptions);
        let tag = e.target.value;
        fileOptions.tag = tag;
        window.userData.tag = tag;
        this.setState({
            fileOptions,
        });
    }
    handleLupingChange(e) {
        const {
            checked,
            value
        } = e.target;
        let luping = this.state.luping;

        luping = checked && value === 'luping' ? '1' : '0';
        this.setState({
            luping,
        });
    }
    handleEmptyClick() {
        this.setState({
            confirmVisible: true,
        });
    }
    resetUplodBtnValue() {
        document.getElementById(this.state.uploadBtnName).value = '';
    }
    handleConfirmEmptyClick(isConfirmed) {
        if (isConfirmed) {
            this.setState({
                files: [],
                curIndex: 0,
                uploadStatus: 0,
                totalBytesTotal: 0,
                totalBytesUploaded: 0,
                confirmVisible: false,
            });
            this.resetUplodBtnValue();
        } else {
            this.setState({
                confirmVisible: false,
            });
        }
    }
    handlePauseClick() {
        let uploadStatus = this.state.uploadStatus;

        let isPaused = uploadStatus === 3;

        let isStopping = false;

        if (isPaused) { // 继续上传
            this.handleUploadClick();
            uploadStatus = 2;
        } else { // 暂停上传
            isStopping = true;
            if (polyv) {
                isStopping = !polyv.stop();
                uploadStatus = !isStopping ? 3 : 2;
            }
        }
        this.setState({
            uploadStatus,
            isStopping,
        });
    }
    handleUploadClick() {
        let {
            files,
            curIndex,
        } = this.state;

        // this.setSpeedTimer();

        this.setState({
            uploadStatus: 2,
        });
        this.uploadFile(files[curIndex], curIndex);
    }
    handleSelectCategoryChange(value) {
        let fileOptions = Object.assign({}, this.state.fileOptions);
        fileOptions.cataid = value;
        this.setState({
            fileOptions,
        });
    }
    handleSysInfoClick() {
        this.setState({
            sysInfo: '',
        });
    }

    componentWillReceiveProps(nextProps) {
        if (!this.state.luping && nextProps.luping.toString() === '1') {
            this.setState({
                luping: nextProps.luping
            });
        }
    }
    render() {
        let {
            confirmVisible,
            fileOptions,
            uploadStatus,
            files,
            speedValue,
            sysInfo,
            luping,
            isStopping,
            pauseDisable,
            uploadDisable,
            uploadBtnName
        } = this.state;
        let {
            cataOptions,
            style,
        } = this.props;

        if (uploadStatus === 0 || uploadStatus === 3) {
            speedValue = '0 Bytes/S';
        }

        let tbodyData = this.getTbodyData(files);
        let tag = fileOptions.tag;

        let sysInfoVisiable = !!sysInfo;

        let cataid = '';
        if (fileOptions.cataid > -1) {
            cataid = fileOptions.cataid;
        } else if (window.userData) {
            cataid = window.userData.cataid;
        }
        let defaultTagPlaceholder = window.userData.defaultTagPlaceholder;
        let selectTitleText = (cataOptions && cataid && cataOptions[cataid]) || '';

        return (
            <div id='uploadList' style={style}>
                <div className="btn-group">
                    <UploadButton 
                        disabled={uploadStatus === 2 || uploadDisable}
                        value='选择文件' name={uploadBtnName} multiple={true} 
                        className="btn-group-element"
                        accept='video/avi,.avi,.f4v,video/mpeg,.mpg,video/mp4,.mp4,video/x-flv,.flv,video/x-ms-wmv,.wmv,video/quicktime,.mov,video/3gpp,.3gp,.rmvb,video/x-matroska,.mkv,.asf,.264,.ts,.mts,.dat,.vob,audio/mpeg,.mp3,audio/x-wav,.wav,video/x-m4v,.m4v,video/webm,.webm,.mod'
                        onChange={this.handleUploadBtnChange} />
                    <Select text={selectTitleText}
                        disabled={uploadStatus === 2 || uploadStatus === 3}
                        options= {cataOptions}
                        className="btn-group-element"
                        onChange={this.handleSelectCategoryChange} />
                    <input className="btn-group-element" type="text" name="tag"
                        disabled={uploadStatus === 2 || uploadStatus === 3}
                        onChange={this.handleTagChange}
                        value={tag}
                        placeholder={defaultTagPlaceholder} />
                    <Button value="清空" className="btn-group-element" 
                        disabled={uploadStatus === 2 || files.length < 1}
                        onClick={this.handleEmptyClick} />
                    <Button value={isStopping?'暂停...':(uploadStatus === 3 ? '继续':'暂停')} 
                        disabled={isStopping || pauseDisable}
                        className="btn-group-element" 
                        onClick={this.handlePauseClick} 
                        visible={uploadStatus === 2 || uploadStatus === 3} />
                    <span style={{display: uploadStatus === 2 ? 'inline' : 'none'}}
                        className="speed btn-group-element">{speedValue}</span>
                    <span className="btn-group-element">
                        <input type="checkbox" name="luping" id="luping"
                            disabled={uploadStatus === 2 || uploadStatus === 3}
                            onChange={this.handleLupingChange} 
                            checked={luping === '1'} value="luping" />
                        <label htmlFor="luping" className="luping">
                            进行视频课件优化处理
                            <span>针对录屏类视频课件，画质更清晰</span>
                        </label>
                    </span>
                    <Button id="uploadFile" value="上传" className="btn-group-element upload" 
                        onClick={this.handleUploadClick} 
                        disabled={uploadStatus !== 1} />
                </div>
                <div className="fileList">
                    <div>
                        <Table tbodyData={tbodyData} onTdClick={this.handleTdClick} />
                    </div>
                </div>
                <Confirm visible={confirmVisible} onClick={this.handleConfirmEmptyClick} confirmInfo="确认清空上传列表？" />
                <SysInfo visible={sysInfoVisiable} sysInfo={sysInfo} onClick={this.handleSysInfoClick} />
            </div>
        );
    }
}
UploadList.propTypes = {
    BASE_URL: PropTypes.object,
    cataOptions: PropTypes.object,
    style: PropTypes.object,
};
