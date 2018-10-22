import React, {
    Component
} from 'react';
import PropTypes from 'prop-types';

export default class DescTd extends Component {
    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleBlur = this.handleBlur.bind(this);

        this.state = {
            desc: '',
        };
    }
    handleChange(e) {
        this.setState({
            desc: e.target.value,
        });
    }
    handleKeyPress(e) {
        if (e.which === 13) {
            e.target.blur();
        }
    }
    handleBlur() {
        this.props.setFileOptions({
            name: 'desc',
            value: this.state.desc,
            index: this.props.index,
        });
    }

    render() {
        let desc = this.state.desc;
        let defaultDescPlaceholder = window.userData.defaultDescPlaceholder;

        return (
            <textarea rows='2' placeholder={defaultDescPlaceholder || '添加描述'} ref={node => this.inputBox = node}
                onChange={this.handleChange}
                onKeyPress={this.handleKeyPress}
                onBlur={this.handleBlur}
                disabled={this.props.uploading} value={desc} />
        );
    }
}
DescTd.propTypes = {
    setFileOptions: PropTypes.func.isRequired,
    uploading: PropTypes.bool.isRequired,
    index: PropTypes.number.isRequired,
};
DescTd.defaultProps = {};
