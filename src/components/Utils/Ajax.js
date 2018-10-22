const XDomainRequest = window.XDomainRequest;

class Ajax {
  static param(a, traditional) {
    let rbracket = /\[\]$/;

    function buildParams(prefix, obj, traditional, add) {
      let name;
      if (Array.isArray(obj)) {
        // Serialize array item.
        obj.forEach((v, i) => {
          if (traditional || rbracket.test(prefix)) {
            // Treat each array item as a scalar.
            add(prefix, v);
          } else {
            // Item is non-scalar (array or object), encode its numeric index.
            buildParams(
              prefix + '[' + (typeof v === 'object' && v !== null ? i : '') + ']',
              v,
              traditional,
              add
            );
          }
        });
      } else if (!traditional && typeof obj === 'object') {
        // Serialize object item.
        for (name in obj) {
          buildParams(prefix + '[' + name + ']', obj[name], traditional, add);
        }
      } else {
        // Serialize scalar item.
        add(prefix, obj);
      }
    }
    var prefix,
      s = [],
      add = function(key, valueOrFunction) {
        // If value is a function, invoke it and use its return value
        var value = typeof valueOrFunction === 'function' ?
          valueOrFunction() :
          valueOrFunction;
        s[s.length] = encodeURIComponent(key) + '=' +
          encodeURIComponent(value === null ? '' : value);
      };
    // If an array was passed in, assume that it is an array of form elements.
    if (Array.isArray(a) || (a.jquery && typeof a === 'object')) {
      // Serialize the form elements
      a.forEach((ele) => {
        add(ele.name, ele.value);
      });
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in a) {
        buildParams(prefix, a[prefix], traditional, add);
      }
    }
    // Return the resulting serialization
    return s.join('&');
    // let encodedString = '';
    // for (let prop in object) {
    //     if (object.hasOwnProperty(prop)) {
    //         // if (typeof object[prop] === 'object') {
    //         //     param
    //         // }
    //         encodedString += encodeURI(`&${prop}=${object[prop]}`);
    //     }
    // }
    // return encodedString.slice(1);
  }

  static fetchIe9(url, options = {}) {
    if (window.XDomainRequest) {
      // https://developer.mozilla.org/en-US/docs/Web/API/XDomainRequest
      // only support GET and POST method
      // request and response content type should be JSON
      // without response status code
      return new Promise((resolve, reject) => {
        const method = options.method || 'GET';
        const timeout = options.timeout || 30000;
        let data = options.body || options.params || {};
        if (data instanceof Object) {
          data = JSON.stringify(data);
        }

        const XDR = new XDomainRequest();
        XDR.open(method, url);
        XDR.timeout = timeout;
        XDR.onload = () => {
          try {
            const json = JSON.parse(XDR.responseText);
            return resolve(json.data);
          } catch (e) {
            reject(e);
          }
          return reject({});
        };
        XDR.ontimeout = () => reject('XDomainRequest timeout');
        XDR.onerror = () => reject('XDomainRequest error');
        XDR.send(data);
      });
    } else {
      // native fetch or polyfill fetch(XMLHttpRequest)
      // fetch...
    }
  }

  static ajax(url, options = {}) {
    const method = options.method || 'GET';
    const timeout = options.timeout || 30000;
    const done = options.done || (() => {});
    const fail = options.fail || (() => {});
    

    if (window.XDomainRequest) {
      let data = options.body || options.params || {};
      if (data instanceof Object) {
        data = JSON.stringify(data);
      }

      const XDR = new XDomainRequest();
      XDR.open(method, url);
      XDR.timeout = timeout;
      XDR.onload = () => {
        try {
          const json = JSON.parse(XDR.responseText);
          done(json.data);
        } catch (e) {
          fail(e);
        }
      };
      XDR.ontimeout = () => fail('XDomainRequest timeout');
      XDR.onerror = () => fail('XDomainRequest error');
      XDR.send(data);
    } else {
      if (queryParams) {
        let queryStr = Ajax.param(queryParams);
        url += `?${queryStr}`;
      }

      let xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      if (headers) {
        for (let key in headers) {
          if (headers.hasOwnProperty(key)) {
            xhr.setRequestHeader(key, headers[key]);
          }
        }
      }
      xhr.onload = function() {
        if (xhr.status === 200) {
          done(xhr.responseText);
        } else {
          fail(xhr.status);
        }
      };
      return xhr;
    }
  }

  // 暂时没用上
  static get({
    url,
    queryParams,
    headers,
    done,
    fail
  }) {
    if (queryParams) {
      let queryStr = Ajax.param(queryParams);
      url += `?${queryStr}`;
    }

    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    if (headers) {
      for (let key in headers) {
        if (headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
    }
    xhr.onload = function() {
      if (xhr.status === 200) {
        done(xhr.responseText);
      } else {
        fail(xhr.status);
      }
    };
    return xhr;
  }

  static post({
    url,
    data,
    queryParams,
    headers,
    done,
    fail
  }) {
    if (queryParams) {
      let queryStr = Ajax.param(queryParams);
      url += `?${queryStr}`;
    }
    let xhr = new XMLHttpRequest();
    let fd = new FormData();
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        fd.append(key, data[key]);
      }
    }
    xhr.open('POST', url);
    if (headers) {
      for (let key in headers) {
        if (headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        switch (xhr.status) {
          case 200:
            done(JSON.parse(xhr.responseText));
            break;
          case 201:
            done(xhr.status, xhr);
            break;
          default:
            fail(xhr.status, xhr);
            break;
        }
      }
    };
    xhr.send(fd);
    return xhr;
  }

  static getJSON({
    url,
    data,
    done,
    fail
  }) {
    if (data) {
      let queryStr = Ajax.param(data);
      url += `?${queryStr}`;
    }
    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          done(JSON.parse(xhr.responseText));
        } else {
          fail(xhr.status);
        }
      }
    };
    xhr.send();
    return xhr;
  }

  // 暂时没用上
  static jsonp({
    url,
    data,
    done
  }) {
    if (data) {
      let queryStr = Ajax.param(data);
      url += `?${queryStr}`;
    }

    let callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    window[callbackName] = function(data) {
      delete window[callbackName];
      document.body.removeChild(script);
      done(data);
    };

    let script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    document.body.appendChild(script);
  }

  static uploadFile({
    url,
    data,
    queryParams,
    headers,
    done,
    fail
  }) {
    if (queryParams) {
      let queryStr = Ajax.param(queryParams);
      url += `?${queryStr}`;
    }
    let xhr = new XMLHttpRequest();
    let fd = new FormData();
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        fd.append(key, data[key]);
      }
    }
    xhr.open('POST', url);
    if (headers) {
      for (let key in headers) {
        if (headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
    }
    xhr.send(fd);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        switch (xhr.status) {
          case 200:
            done(JSON.parse(xhr.responseText));
            break;
          case 201:
            done(xhr.status, xhr);
            break;
          default:
            fail(xhr.status, xhr);
            break;
        }
      }
    };
  }

  // 暂时没用上
  static head({
    url,
    cache,
    done,
    fail
  }) {
    // console.log('head!!!');

    let xhr = new XMLHttpRequest();

    xhr.open('HEAD', url);
    // if (!cache) {
    //     xhr.setRequestHeader('Cache-Control', 'no-cache');
    // }
    xhr.send();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          done(null, xhr.status, xhr);
        } else {
          fail(xhr.status);
        }
      }
    };
  }
}

export default {
  getJSON: Ajax.getJSON,
  uploadFile: Ajax.uploadFile,
  post: Ajax.post,
};