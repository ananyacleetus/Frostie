var EM = EM || {};
EM.compatibility = (function ($) {

    // Globals
    var ua = navigator.userAgent.toLowerCase(),
        device = "",
        type = "",
        browser = "",
        version = "";

    // Return if device and browser compatible with current presentation
    function isCompatible () {
        device = detectDevice();
        browser = detectBrowser();

        return checkCompatibility( EM.scenemanager.presentation.core.supportedBrowsers );
    }

    function isCompatible_DemocraticVersion(compatabilitysTring) {
        device = detectDevice();
        browser = detectBrowser();

        return checkCompatibility(compatabilitysTring);
    }


    /** Private methods **/

    // Returns device name and set it's type (global vars)
    function detectDevice () {
        if ( /android/i.test(ua) ){
            type = "android";

            if (/mobile/i.test(ua)) {
                return "mobile";
            } else {
                return "tablet";
            }
        }

        if ( /ipad/i.test(ua) ){
            type = "ipad";
            return "tablet";
        }

        if ( /iphone/i.test(ua) ){
            type = "iphone";
            return "mobile";
        }

        if (ua.indexOf('Mac OS X') != -1){
            type = "mac"
        } else {
            type = "pc"
        }
        
        return "desktop";
    }

    // Returns browser name, other if none trivial one
    function detectBrowser () {
        if (/chrome/i.test(ua)) {
            $('body').addClass('chrome');
            return "chrome";
        }

        if (/firefox/i.test(ua)) {
            $('body').addClass('firefox');
            return "firefox";
        }

        if (/safari/i.test(ua)) {
            $('body').addClass('safari');
            return "safari";
        }

        if (/msie/i.test(ua) || /trident/i.test(ua)) {
            $('body').addClass('explorer');
            return "ie";
        }
        $('body').addClass('other');
        return "other";
    }

    // returns true if user device & browser can support presentation dependencies
    function checkCompatibility ( str ) {
        var dependencies = JSON.parse(str);

        // If we don't know the browser we will support
        if ( browser === "other" ){
            return true;
        }

        if ( device === "desktop" ){

            // In case browser type isn't supported (IE for example) we use 0
            if ( dependencies[device][type][browser] === 0 ){
                return false;
            }

            // Return true if browser version >= to the dependecy
            return dependencies[device][type][browser] <= getBrowserVersion();
        }

        // tablet & mobile will have 1 or 0 as "version"; 1 means supporting
        return dependencies[device][type][browser] > 0;
        
    }

    // Returns browser version as an integer
    function getBrowserVersion () {
        var tem;

        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        
        // IF IE 11
        if(/trident/i.test( M[1] )){
            tem = /\brv[ :]+(\d+)/g.exec( ua ) || [];
            return +tem[1];
        }

        // Is it chrome or Opera
        if(M[1] === 'Chrome'){
            tem = ua.match(/\bOPR\/(\d+)/)
            if( tem != null ) return tem[1];
        }

        M = M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        
        // Get version
        if((tem = ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
        
        return +M[1];

    }

    // Simple getters

    // return device
    function getDevice () {
        device = detectDevice();
        
        return device;

    }

    // return device firm
    function getType () {
        detectDevice();
        
        return type;

    }

    // return browser;version
    function getBrowser () {
        browser = detectBrowser();
        version = getBrowserVersion();

        return browser + ';' + version;
    }

    return {
        isCompatible: isCompatible,
        getDevice: getDevice,
        getType: getType,
        getBrowser: getBrowser,
	    isCompatible_DemocraticVersion: isCompatible_DemocraticVersion
    }

}(jQuery));