/**
 * @author flyerjay
 * 工具类，实现了xhr的get和post方法以及请求的管理（取消，超时，返回码），本地存储，时间格式化，页面路由钩子等方法
 */
import { Indicator, Toast } from 'mint-ui'
import router from '../router';
import store from '../model';

const Tool = {};
// const target = 'http://47.92.32.44:8091/maintenance-plug/app/';//本地测试环境
// const target = 'http://10.17.5.162:9991/maintenance-plug/app/';//本地测试环境
const target = 'https://cloud.mall.changan.com.cn/maintenance-plug/app/';//服务器后端目录
const imagePath = 'http://service.mall.changan.com.cn/static/';//静态文件目录
const CLOSE_NETWORK = false;//在本地调试时关闭网络，只调整静态页面
var requestPool = [];//请求池
Tool.target = target;
Tool.imagePath = imagePath;
Tool.version = "2.0.1";//增加版本号,现在主要控制引导页的显示，每次更新版本手动更新下这个版本号。

Tool.ajax = function(mySetting){
    var setting = {
        url:window.location.pathname,
        async:true,
        type:'GET',
        data:{},
        dataType:'json',
        timeout:30000,
        success:function (data) {},
        error:function (error) {},
        mask:true,
    }

    var aData = [];
    var sData = '';

    for(var attr in mySetting){
        setting[attr] = mySetting[attr];
    }
    for(var attr in setting.data){
        aData.push(attr + '=' + filter(setting.data[attr]));
    }
    sData = aData.join('&');
    setting.type = setting.type.toUpperCase();
    if(CLOSE_NETWORK){
        return false;
    }
    var xhr = new XMLHttpRequest();
    if(setting.mask){//是否启用遮罩层
        Indicator.open({
            spinnerType:'fading-circle',
        });
    }
    try{
        if ( setting.type === 'GET' || setting === 'get') {
            sData = setting.url + '?' + sData;
            xhr.open(setting.type, sData + '&_t=' + new Date().getTime(), setting.async);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded;charset=UTF-8");
            xhr.timeout = setting.timeout;
            xhr.ontimeout  = () => {
                xhr.explain = 'timeout'
            }
            setTimeout(()=>{
                xhr.explain = 'timeout'
            },setting.timeout)
            xhr.onabort = () => {
                xhr.explain = 'abort'
            }
            xhr.send()
        } else {
            xhr.open(setting.type, setting.url, setting.async);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded;charset=UTF-8");
            xhr.timeout = setting.timeout;
            xhr.ontimeout  = ()=>{
                this.explain = 'timeout'
            }
            setTimeout(()=>{
                xhr.explain = 'timeout'
            },setting.timeout)
            xhr.onabort = () => {
                xhr.explain = 'abort'
            }
            xhr.send(sData);
        }
        requestPool.push(xhr);
        xhr.explain = '';
        xhr.index = requestPool.length - 1;
    }catch(e){
        return httpEnd();
    }

    if (setting.async) {
        xhr.addEventListener('readystatechange', httpEnd, false);
    } else {
        httpEnd();
    }

    function httpEnd(){
        if(xhr.readyState == 4){
            var head = xhr.getAllResponseHeaders();
            var response = xhr.responseText;

            if (/application\/json/.test(head) || setting.dataType === 'json' && /^(\{|\[)([\s\S])*?(\]|\})$/.test(response)) {
                response = JSON.parse(response);
            }
            requestPool.splice( xhr.index, xhr.index + 1 );
            for(var i=0;i<requestPool.length;i++){
                requestPool[i].index = i;//更新剩余请求的标志位
            }
            if (xhr.status == 200) {
                setting.success(response, setting, xhr);
            } else {
                setTimeout(()=>{//异步错误处理，保证请求状态在错误处理逻辑之前改变，否则无法保证正确处理错误状态
                    if(xhr.status === 0){
                        if(xhr.explain == 'abort'){
                            //取消ajax不报提示
                        }else if(xhr.explain == 'timeout'){
                            Toast({
                                message:'网路请求超时',
                                duration:1000,
                            });
                        }else{
                            Toast({
                                message:'网络连接失败，请检查您的网络',
                                duration:1000,
                            });
                        }
                    }else{
                        Toast({
                            message:'网络错误，错误代码:'+ xhr.status,
                            duration:1000,
                        });
                    }
                    setting.error(xhr);
                    xhr.end();
                },50);
            }
        }
        if(requestPool.length < 1){//当所有发出的请求都完成的时候才取消遮罩层，这里可以优化
            Indicator.close();
        }
    }

    xhr.end = function () {
        xhr.removeEventListener('readystatechange', httpEnd, false);
    }

    function filter(str) { //特殊字符转义
        str += ''; //隐式转换
        str = str.replace(/%/g, '%25');
        str = str.replace(/\+/g, '%2B');
        str = str.replace(/ /g, '%20');
        str = str.replace(/\//g, '%2F');
        str = str.replace(/\?/g, '%3F');
        str = str.replace(/&/g, '%26');
        str = str.replace(/\=/g, '%3D');
        str = str.replace(/#/g, '%23');
        return str;
    }
    return xhr;
}

/**
 * 封装ajax post请求
 * @param {string} pathname 服务器请求地址
 * @param {object} data     发送给服务器的数据
 * @param {function} success  请求成功执行方法
 * @param {function} error    请求失败执行方法
 */
Tool.post = function (pathname, data, success, error) {
    var setting = {
        url: target + pathname, //默认ajax请求地址
        type: 'POST', //请求的方式
        data: data, //发给服务器的数据
        success: success,
        error: error,
    };
    return Tool.ajax(setting);
};
/**
 * 封装ajax get请求
 * @param {string} pathname 服务器请求地址
 * @param {object} data     发送给服务器的数据
 * @param {function} success  请求成功执行方法
 * @param {function} error    请求失败执行方法
 */
Tool.get = function (pathname, data, success, setting, error) {
    var setting = {
        url: target + pathname, //默认ajax请求地址
        type: 'GET', //请求的方式
        data: data, //发给服务器的数据
        success: success || function () { }, //请求成功执行方法
        error: error || function () { }, //请求失败执行方法
        ...setting//加载自定义的配置，如是否启用mask
    };
    return Tool.ajax(setting);
};
/**
 * 地名转换为位置信息
 * @param {string} address 当前位置名称
 */
Tool.getLocation = function(address,success,error){
    $.ajax({
        url:"http://api.map.baidu.com/geocoder/v2/?address="+address+"&output=json&ak=V5qLiGqxsGZZpRt8nqUERSpA2A18MLjk",
        type:'GET',
        dataType:'jsonp',
        jsonp:'callback',
        jsonpCallback:'jscb', 
        success:success || function(){
        },
        error:error || function(){

        },
    })
}
/**
 * 清空请求池中的所有请求
 */
Tool.clearRequestPool =function(){
    for(var i = 0; i < requestPool.length; i++){
        requestPool[i].explain = 'abort';
        requestPool[i].abort();//中断请求;
    }
    requestPool.splice(0,requestPool.length);
    return requestPool;
}


/**
 * 时间格式化 支持date、time、onlytime,fulltime四种格式，传入的日期可以是时间戳也可以是时间字符串;
 * @param {str} String,Date,timeTemp
 * @param type String 'date,tiem,onlytime,fulltime' 
 */
Tool.formatDate = function(str,type='date',gutter="-"){
    var date = new Date(str);
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ( "0" + m ) : m;
    var d = date.getDate();
    d = d < 10 ? ( "0" + d ) : d;
    var h = date.getHours();
    var min = date.getMinutes();
    min = min < 10 ? ( "0" + min ) : min;
    var s = date.getSeconds();
    s = s < 10 ? ( "0" +s ) : s; 
    switch(type){
        case 'date':
            return y + gutter + m + gutter + d;
            break;
        case 'time':
            return y + gutter + m + gutter + d + ' ' + h + ':' + min;
        case 'onlytime':
            return h + ':' + min;
        case 'fulltime':
            return y + gutter + m + gutter + d + ' ' + h + ':' + min + ':' + s;
    }   
}
/**
 * 获取今天的日期 XXXX-XX-XX;
 * @param {type} String 'date,time,onlytime'
 */
Tool.getCurrentDate = function(type='date',gutter="-"){
    var now = new Date();
    return this.formatDate(now,type,gutter);
}


/**
 * 本地存储
 */
Tool.localItem = function(key, value){
    if(arguments.length == 1){
        return localStorage.getItem(key);
    }else{
        if(typeof value == 'object'){
            return localStorage.setItem(key,JSON.stringify(value));
        }else{
            return localStorage.setItem(key,value);
        }
    }
}

Tool.removeLocalItem = function(key){
    if(key){
        return localStorage.removeItem(key);
    }
    return localStorage.removeItem();
}
/**
 * @param {Object} obj 需要清空的对象
 * 本方法是枚举对象中的属性并逐一置为空
 */
Tool.removeObject = function(obj){
    var self = this;
    if(!obj) return;
    if(typeof obj === 'object'){
        var arr = Object.keys(obj);
        for(var i = 0; i < arr.length; i++){
            if(typeof obj[arr[i]] == 'object' && !(obj[arr[i]] instanceof Array)){
                self.removeObject(obj[arr[i]]);
            }else if(obj[arr[i]] instanceof Array){
                obj[arr[i]] = [];
            }else{
                obj[arr[i]] = '';
            }
        }
    }else{
        obj = '';
    }
    return ;
}

Tool.extends = function(src,des){
    if(!src || !des) return;
    if(typeof src === 'object'){
        var arr = Object.keys(src);
        for(var i = 0; i< arr.length; i++){
            if(typeof src[arr[i]] == 'object' && !([src[arr[i]]] instanceof Array)){
                this.extends(src[arr[i]],des[arr[i]])
            }else if(src[arr[i]] instanceof Array){
                src[arr[i]].map(v => {
                    des[arr[i]].push(v);
                });
            }else{
                des[arr[i]] = src[arr[i]];
            }
        }
    }
}

/**
 * 获取用户信息
 */
Tool.getUserInfo = function(key){
    var user = localStorage.getItem('userInfo');
    if(user){
        return JSON.parse(user)[key];
    }else{
        return false;
    }
}
/**
 * 路由登录逻辑
 */
Tool.routerEnter = function(to,from,next){//确定用户是否已经登陆
    if(Tool.localItem('userInfo') && Tool.getUserInfo('userId')){
        next();
    }else{
        store.commit('POP_PAGE',1);//在进入login之前把已进栈但是没有被访问的页面清理出栈
        next({name:'login',params:{to:to.path}});
    }
}
Tool.isWeChat = function(){
    var ua = navigator.userAgent.toLowerCase();
    if(ua.match(/MicroMessenger/i) == "micromessenger") {
        return true;
    } else {
        return false;
    }
}
/**
 * URLdecode
 */
Tool.urldecode = function(str, charset, callback) {
    var script = document.createElement('script');
    script.id = '_urlDecodeFn_';
    window._urlDecodeFn_ = callback;
    if (document.all) {
        if(navigator.userAgent.indexOf('MSIE 8')>-1){
            //对于ie8做特别hack
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.charset = charset;
            link.href = 'data:text/plain;charset=' + charset + ',%23_decode_hidden_el_for_test_%7Bbackground-image%3Aurl(' + str + ')%7D';
            alert(link.href);
            document.body.appendChild(link);
            //然后创建一个隐藏的div，应用这个样式
            var div = document.createElement('div');
            div.id = '_decode_hidden_el_for_test_';
            div.style.display = 'none';
            document.body.appendChild(div);
            setTimeout(function(){
                callback(document.getElementById('_decode_hidden_el_for_test_').currentStyle['backgroundImage'].match(/\("data\:text\/(.+)"\)/)[1]);
                link.parentNode.removeChild(link);
                div.parentNode.removeChild(div);
            }, 300)
        }else{
            //隐藏iframe截获提交的字符串
            if (!window['_urlDecode_iframe_']) {
                var iframe;
                if(document.all){
                    try{
                        iframe = document.createElement('<iframe name="_urlDecode_iframe_"></iframe>');
                    }catch(e){
                        iframe = document.createElement('iframe');
                        //iframe.name = '_urlDecode_iframe_';
                        iframe.setAttribute('name', '_urlDecode_iframe_');
                    }
                }else{
                    iframe = document.createElement('iframe');
                    //iframe.name = '_urlDecode_iframe_';
                    iframe.setAttribute('name', '_urlDecode_iframe_');
                }
                //iframe.name = '_urlDecode_iframe_';
                iframe.setAttribute('name', '_urlDecode_iframe_');
                iframe.style.display = 'none';
                iframe.width = "0";
                iframe.height = "0";
                iframe.scrolling = "no";
                iframe.allowtransparency = "true";
                iframe.frameborder = "0";
                iframe.src = 'about:blank';
                document.body.appendChild(iframe);
            }
            //ie下需要指明charset，然后src=datauri才可以
            iframe.contentWindow.document.write('<html><scrip' + 't charset="gbk" src="data:text/javascript;charset=gbk,parent._decodeStr_=\'' + str + '\'"></s'+'cript></html>');
            setTimeout(function() {
                callback(_decodeStr_);
                iframe.parentNode.removeChild(iframe);
            }, 300)
        }
    } else {
        var src = 'data:text/javascript;charset=' + charset + ',_urlDecodeFn_("' + str + '");';
        src += 'document.getElementById("_urlDecodeFn_").parentNode.removeChild(document.getElementById("_urlDecodeFn_"));';
        script.src = src;
        document.body.appendChild(script);
    }
}

export default Tool;