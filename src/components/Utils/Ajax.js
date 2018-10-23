const XDomainRequest = window.XDomainRequest;

class Ajax {
  static post({
    url,
    data,
    done,
    fail
  }) {
    let xhr = new XMLHttpRequest();
    let fd = new FormData();
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        fd.append(key, data[key]);
      }
    }
    xhr.open('POST', url);
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

  static uploadFile({
    url,
    data,
    done,
    fail
  }) {
    
    let xhr = new XMLHttpRequest();
    let fd = new FormData();
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        fd.append(key, data[key]);
      }
    }
    xhr.open('POST', url);
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

  static ajax(url, options = {}) {
    const method = options.method || 'GET';
    const timeout = options.timeout || 30000;
    let data = options.data || null;

    return new Promise((resolve, reject) => {
      if (window.XDomainRequest) {
        if (data instanceof Object) {
          if (method === 'GET') {
            let queryStr = Ajax.param(data);
            url += `?${queryStr}`;
            data = null;
          } else if (method === 'POST') {
            data = JSON.stringify(data);
          }
        }

        const XDR = new XDomainRequest();
        XDR.open(method, url);
        XDR.timeout = timeout;
        XDR.onload = () => {
          try {
            return resolve(JSON.parse(XDR.responseText));
          } catch (e) {
            reject(e);
          }
          return reject({});
        };
        // fix random aborting: https://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
        XDR.onprogress = () => {};
        XDR.ontimeout = () => reject('XDomainRequest timeout');
        XDR.onerror = () => reject('XDomainRequest error');
        setTimeout(() => {
          XDR.send(data);
        }, 0);
      } else {
        let fd = null;
        if (data instanceof Object) {
          if (method === 'GET') {
            let queryStr = Ajax.param(data);
            url += `?${queryStr}`;
          } else if (method === 'POST') {
            fd = new FormData();
            for (let key in data) {
              if (data.hasOwnProperty(key)) {
                fd.append(key, data[key]);
              }
            }
          }
        }

        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 400) {
              return resolve(JSON.parse(xhr.responseText));
            }
            return reject(xhr.status);
          }
        };
        xhr.send(fd);
      }
    });
  }
}

export default {
  getJSON: Ajax.getJSON,
  uploadFile: Ajax.uploadFile,
  post: Ajax.post,
  ajax: Ajax.ajax
};
