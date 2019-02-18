/*
* ESMART Token Web JavaScript class
*/
var esmartTokenWeb = function () {
  'use strict';
  var isInit = false;
  var lastSuccessHandler;

  var _init = function (successHandler, errorHandler) {
    if (isInit) {
      errorHandler("Already initializated.");
      return false;
    }

    if (!checkVersion()) {
      errorHandler("Your have unsupported browser. Only Mozilla Firefox version from 38 to 52 is supported now.");
      return false;
    }

    if (window.esmartTokenWebVersionInfo === undefined) {
      errorHandler("ESMART Token WEB Plugin is not instaled or disabled.");
      return false;
    }

    lastSuccessHandler = successHandler;
    // register event listener for responses
    window.addEventListener("esmart-token-addon-message-response", function (event) {
      var data = event.detail;
      lastSuccessHandler(data);
    }, false);

    isInit = true;
    successHandler(esmartTokenWebVersionInfo.fullName + ' ' + esmartTokenWebVersionInfo.fullVersion);
    return isInit;
  }

  var _listSlots = function (successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    return _sendCommand('listslots', {}, successHandler, errorHandler);
  }

  var _listCerts = function (successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    return _sendCommand('listcerts', {}, successHandler, errorHandler);
  }

  var _listCertsEx = function (andOidFilterArray_, orOidFilterArray_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    // check minimum plugin version 1.4.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 4) {
      errorHandler("You should have plugin version 1.4.0 or higher to use this function.");
      return false;
    }

    return _sendCommand('listcertsex', {
      andOidFilterArray: andOidFilterArray_,
      orOidFilterArray: orOidFilterArray_
    }, successHandler, errorHandler);
  }

  var _pkcs7ValidateInParam = function (certid_, data_, errorHandler) {
    if (certid_ == '') {
      errorHandler("certid can't be empty.");
      return false;
    }
    if (certid_.length % 2 != 0) {
      errorHandler("Invalid cert ID.");
      return false;
    }

    if (data_ == '') {
      errorHandler("data can't be empty.");
      return false;
    }

    return true;
  }

  var _pkcs7Sign = function (certid_, slot_, data_, flag_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    if (!_pkcs7ValidateInParam(certid_, data_, errorHandler)) {
      return false;
    }

    return _sendCommand('pkcs7sign', {
      certid: certid_,
      slot: slot_,
      data: data_,
      flag: flag_
    }, successHandler, errorHandler);
  }

  var _pkcs7SignDsig = function (certid_, slot_, data_, dsigurl_, flag_, successHandler, errorHandler) {
    // check minimum plugin version 1.3.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 3) {
      errorHandler("You should have plugin version 1.3.0 or higher to use this function.");
      return false;
    }

    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    if (!_pkcs7ValidateInParam(certid_, data_, errorHandler)) {
      return false;
    }

    return _sendCommand('pkcs7sign',
        {certid: certid_, slot: slot_, data: data_, flag: flag_, dsigurl: dsigurl_}, successHandler, errorHandler);
  }

  var _pkcs7Verify = function (signature_, data_, verifychain_, crls_, slot_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 1) {
      errorHandler("You should have plugin version 1.1.0 or higher to use this function.");
      return false;
    }

    if (signature_ == '') {
      errorHandler("signature can't be empty.");
      return false;
    }

    if (verifychain_ && !(crls_ instanceof Array)) {
      errorHandler("crls must be array type.");
      return false;
    }

    return _sendCommand('pkcs7verify',
        {signature: signature_, slot: slot_, data: data_, verifychain: verifychain_, crls: crls_},
        successHandler, errorHandler);
  }

  var _pkcs7VerifyEx = function (signature_, data_, flag_, dsigurl_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.3.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 3) {
      errorHandler("You should have plugin version 1.3.0 or higher to use this function.");
      return false;
    }

    if (signature_ == '') {
      errorHandler("signature can't be empty.");
      return false;
    }

    if (dsigurl_ == '') {
      errorHandler("dSig URL can't be empty.");
      return false;
    }

    return _sendCommand('pkcs7verifyex',
        {signature: signature_, data: data_, flag: flag_, dsigurl: dsigurl_},
        successHandler, errorHandler);
  }

  var _sendCommand = function (cmd_, payload, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    lastSuccessHandler = successHandler;

    var event = document.createEvent('CustomEvent');
    // TODO: deprecated function, need to be reviewed
    event.initCustomEvent("esmart-token-addon-message", true, true, {cmd: cmd_, data: payload});
    document.documentElement.dispatchEvent(event);

    return true;
  }

  var _changeUserPin = function (slot_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 2) {
      errorHandler("You should have plugin version 1.2.0 or higher to use this function.");
      return false;
    }

    return _sendCommand('changeUserPin', {slot: slot_}, successHandler, errorHandler);
  }

  var _listData = function (isReadPrivateData, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 2) {
      errorHandler("You should have plugin version 1.2.0 or higher to use this function.");
      return false;
    }

    return _sendCommand('listData', {readPrivate: isReadPrivateData}, successHandler, errorHandler);
  }

  var _saveData = function (slot_, dataLabel, dataValue, isPrivateData, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || esmartTokenWebVersionInfo.minor < 2) {
      errorHandler("You should have plugin version 1.2.0 or higher to use this function.");
      return false;
    }

    if (dataLabel == '') {
      errorHandler("label can't be empty.");
      return false;
    }

    return _sendCommand('saveData', {
      slot: slot_, label: dataLabel,
      value: dataValue, isPrivate: isPrivateData
    }, successHandler, errorHandler);
  }

  var checkVersion = function () {
    if (navigator.userAgent.indexOf("Firefox") == -1) {
      return false;
    }
    var match = navigator.userAgent.match(/Firefox\/([0-9]+)\./);
    var ver = match ? parseInt(match[1]) : 0;
    if (ver == 0 || ver > 52) {
      return false;
    }
    return true;
  }

  return {
    init: function (successHandler, errorHandler) {
      return _init(successHandler, errorHandler);
    },
    listSlots: function (successHandler, errorHandler) {
      return _listSlots(successHandler, errorHandler);
    },
    listCerts: function (successHandler, errorHandler) {
      return _listCerts(successHandler, errorHandler);
    },
    listCertsEx: function (andOidFilterArray, orOidFilterArray, successHandler, errorHandler) {
      return _listCertsEx(andOidFilterArray, orOidFilterArray, successHandler, errorHandler);
    },
    pkcs7Sign: function (certid, slot, data, flag, successHandler, errorHandler) {
      return _pkcs7Sign(certid, slot, data, flag, successHandler, errorHandler);
    },
    pkcs7Verify: function (signature, data, verifychain, crls, slot, successHandler, errorHandler) {
      return _pkcs7Verify(signature, data, verifychain, crls, slot, successHandler, errorHandler);
    },
    pkcs7VerifyEx: function (signature, data, flag, dsigurl, successHandler, errorHandler) {
      return _pkcs7VerifyEx(signature, data, flag, dsigurl, successHandler, errorHandler);
    },
    changeUserPin: function (slot, successHandler, errorHandler) {
      return _changeUserPin(slot, successHandler, errorHandler);
    },
    listData: function (isReadPrivateData, successHandler, errorHandler) {
      return _listData(isReadPrivateData, successHandler, errorHandler);
    },
    saveData: function (slot, dataLabel, dataValue, isPrivateData, successHandler, errorHandler) {
      return _saveData(slot, dataLabel, dataValue, isPrivateData, successHandler, errorHandler);
    },
    pkcs7SignDsig: function (certid, slot, data, dsigurl, flag, successHandler, errorHandler) {
      return _pkcs7SignDsig(certid, slot, data, dsigurl, flag, successHandler, errorHandler);
    }
  };
}();
module.exports = esmartTokenWeb;