import React, {
    Component
} from 'react';
import PropTypes from 'prop-types';
import './sysInfo.scss';

export default class SysInfo extends Component {
    constructor(props) {
        super(props);

        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        if (this.props.onClick instanceof Function) {
            this.props.onClick();
        }
    }

    render() {
        const {
            sysInfo,
            visible,
        } = this.props;

        return (
            <div className="sysInfoWrap" style={{display: visible ? 'block' : 'none'}}>
                <div className="sysInfo">
                    <div className="sysInfo-cont">
                        {sysInfo}
                        <span className="sysInfo-close" onClick={this.handleClick}>&times;</span>
                    </div>
                </div>
            </div>
        );
    }
}
SysInfo.propTypes = {
    visible: PropTypes.bool,
    sysInfo: PropTypes.string,
};
SysInfo.defaultProps = {
    visible: false,
    sysInfo: '',
};
