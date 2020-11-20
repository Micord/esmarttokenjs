/*
* ESMART Token Web JavaScript class
*/
var esmartTokenWeb = function() {
  'use strict';
  let isInit = false;
  let lastSuccessHandler;
  let externalHandlersArray = [];

  let cbQueue = function() {
    let _maxElement = 100;
    let _curPos = _maxElement - 1;
    let _cbArray = [];

    let _getNextPos = function () {
      if (_curPos < _maxElement - 1) {
        return ++_curPos;
      }
      _curPos = 0;
      return _curPos;
    }

    let _registerCb = function (handler) {
      let pos = _getNextPos();
      if (typeof _cbArray[pos] === 'function') {
        console.log("cbQueue._registerCb", "possition", pos, "already used and will be replaced!!!");
      }

      _cbArray[pos] = handler;
      return pos;
    }

    let _applyCb = function (pos, param) {
      let cb = _cbArray[pos];
      if (typeof cb === 'function') {
        _cbArray[pos] = 'undefined';
        //_cbArray.splice(pos, 1);
        return cb(param);
      }
      console.log("cbQueue._applyCb", "callback not found for", pos);
      return false;
    }

    return {
      registerCb: function (handler) {
        return _registerCb(handler);
      },
      applyCb: function (id, param) {
        return _applyCb(id, param);
      }
    }
  }();

  let _init = function(successHandler, errorHandler) {
    if (isInit) {
      errorHandler("Already initializated.");
      return false;
    }

    if (!checkVersion()) {
      errorHandler("Your have unsupported browser. Only Mozilla Firefox version from 38 is supported now.");
      return false;
    }

    if (window.esmartTokenWebVersionInfo === undefined) {
      errorHandler("ESMART Token WEB Plugin is not instaled or disabled.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API
    if (esmartTokenWebVersionInfo.major > 1) {
      window.addEventListener("message", function(event)
      {
        if (event.source == window &&
            event.data &&
            event.data.direction == "esmart-token-addon-message-response")
        {
          cbQueue.applyCb(event.data.requestid, event.data.message);
        }
      });
    }
    else {
      lastSuccessHandler = successHandler;
      // register event listener for responses
      window.addEventListener("esmart-token-addon-message-response", function(event)
      {
        let data = event.detail;
        lastSuccessHandler(data);
      }, false);
    }

    isInit = true;
    successHandler(esmartTokenWebVersionInfo.fullName + ' ' + esmartTokenWebVersionInfo.fullVersion);
    return isInit;
  }

  let _listSlots = function(successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    return _sendCommand('listslots', {}, successHandler, errorHandler);
  }

  let _listCerts = function(successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API and require to get PIN
    let payload = {};
    if (esmartTokenWebVersionInfo.major > 1) {
      _requestAllSlotsId(function(slotsIds) {
        payload = {
          slotsData: slotsIds
        };
        _sendCommand('listcerts', payload, successHandler, errorHandler);
      }, errorHandler);
      return true;
    }
    else {
      return _sendCommand('listcerts', payload, successHandler, errorHandler);
    }
  }

  let _requestAllSlotsId = function(successHandler, errorHandler) {
    _listSlots(function(str) {
      let obj = JSON.parse(str);
      if (obj.resp != 'OK') {
        errorHandler(obj.error.message + ' Error code (' + obj.error.code + ')');
        return;
      }
      let res = JSON.parse(obj.result);
      let slotsIds = [];
      if (res.length > 0) {
        return _requestIdForSlot(res, slotsIds, successHandler, errorHandler);
      }
      else {
        return successHandler(slotsInfo);
      }
    }, errorHandler);

    return true;
  }

  let _requestIdForSlot = function(slotsInfo, slotsIds, successHandler, errorHandler) {
    if (slotsInfo.length <= slotsIds.length) {
      successHandler(slotsIds);
      return true;
    }
    let i = slotsIds.length;
    slotsIds[i] = {
      slotid: slotsInfo[i].slot,
      validTokenPresent: slotsInfo[i].validTokenPresent
    };
    return _requestIdForSlot(slotsInfo, slotsIds, successHandler, errorHandler);
  }

  let _requestUserPinForAllSlots = function(successHandler, errorHandler) {
    let cbtype = 'userpin';
    let cb = _findExternalCallback(cbtype);
    if (typeof cb !== 'function') {
      errorHandler("Callback for request User PIN not found");
    }

    _listSlots(function(str) {
      let obj = JSON.parse(str);
      if (obj.resp != 'OK') {
        errorHandler(obj.error.message + ' Error code (' + obj.error.code + ')');
        return;
      }
      let res = JSON.parse(obj.result);
      let slotsUserPin = [];
      if (res.length > 0) {
        return _requestUserPinForSlot(res, slotsUserPin, cb, cbtype, successHandler, errorHandler);
      }
      else {
        return successHandler(slotsUserPin);
      }
    }, errorHandler);

    return true;
  }

  let _requestUserPinForOneSlots = function(slotid, cbname, successHandler, errorHandler) {
    let cb = _findExternalCallback(cbname);
    if (typeof cb !== 'function') {
      errorHandler("Callback for request User PIN not found");
    }
    //console.log("_requestUserPinForOneSlots for ", cbname);

    _listSlots(function(str) {
      let obj = JSON.parse(str);
      if (obj.resp != 'OK') {
        errorHandler(obj.error.message + ' Error code (' + obj.error.code + ')');
        return;
      }
      let res = JSON.parse(obj.result);
      let slotsUserPin = [];
      if (res.length > 0) {
        for (let i = 0; i < res.length; i++) {
          if (res[i].slot == slotid && res[i].validTokenPresent === true) {
            //console.log("_requestUserPinForSlot for ", i, JSON.stringify(res[i]));
            return _requestUserPinForSlot([res[i]], slotsUserPin, cb, cbname, successHandler, errorHandler);
          }
        }
        return errorHandler('Slot ' + slotid + ' not found.');
      }
      else {
        return errorHandler('Slot ' + slotid + ' not found.');
      }
    }, errorHandler);

    return true;
  }

  let _requestUserPinForSlot = function(slotsInfo, slotsUserPin, cbGetPin, cbtype, successHandler, errorHandler) {
    if (slotsInfo.length <= slotsUserPin.length) {
      successHandler(slotsUserPin);
      return true;
    }
    let i = slotsUserPin.length;
    if (slotsInfo[i].validTokenPresent === true) {
      if (cbtype == 'changeuserpin') {
        //console.log("Get change PIN for ", JSON.stringify(slotsInfo[i]));
        cbGetPin(slotsInfo[i].label, function(_pin, _newpin) {
          slotsUserPin[i] = {
            slotid: slotsInfo[i].slot,
            validTokenPresent: true,
            pin: _pin,
            newpin: _newpin
          };
          return _requestUserPinForSlot(slotsInfo, slotsUserPin, cbGetPin, cbtype, successHandler, errorHandler);
        }, function() { errorHandler('Canceled'); });
      }
      else {
        //console.log("Get PIN for ", JSON.stringify(slotsInfo[i]));
        cbGetPin(slotsInfo[i].label, function(_pin) {
          slotsUserPin[i] = {
            slotid: slotsInfo[i].slot,
            validTokenPresent: true,
            pin: _pin
          };
          return _requestUserPinForSlot(slotsInfo, slotsUserPin, cbGetPin, cbtype, successHandler, errorHandler);
        }, function() { errorHandler('Canceled'); });
      }
    }
    else {
      slotsUserPin[i] = {
        slotid: slotsInfo[i].slot,
        validTokenPresent: false
      };
      return _requestUserPinForSlot(slotsInfo, slotsUserPin, cbGetPin, cbtype, successHandler, errorHandler);
    }

    return true;
  }

  let _listCertsEx = function(andOidFilterArray_, orOidFilterArray_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    // check minimum plugin version 1.4.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 4)) {
      errorHandler("You should have plugin version 1.4.0 or higher to use this function.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API and require to get PIN
    let payload = { andOidFilterArray: andOidFilterArray_, orOidFilterArray: orOidFilterArray_};
    if (esmartTokenWebVersionInfo.major > 1) {
      _requestAllSlotsId(function(slotsIds) {
        payload = {
          slotsData: slotsIds,
          andOidFilterArray: andOidFilterArray_,
          orOidFilterArray: orOidFilterArray_
        };
        _sendCommand('listcertsex', payload, successHandler, errorHandler);
      }, errorHandler);
      return true;
    }
    else {
      return _sendCommand('listcertsex', payload, successHandler, errorHandler);
    }
  }

  let _pkcs7ValidateInParam = function(certid_, data_, errorHandler) {
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

  let _pkcs7Sign = function(certid_, slot_, data_, flag_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }
    if (!_pkcs7ValidateInParam(certid_, data_, errorHandler)) {
      return false;
    }

    console.log("_pkcs7Sign", certid_, slot_, data_, flag_);

    // Version 2.0 and higher use WebExtension API and require to get PIN
    if (esmartTokenWebVersionInfo.major > 1) {
      _requestUserPinForOneSlots(slot_, 'userpin', function(slotsUserPin) {
        let payload = {
          certid: certid_,
          slot: parseInt(slot_),
          data: data_,
          flag: flag_,
          pin: slotsUserPin[0].pin
        };
        _sendCommand('pkcs7sign', payload, successHandler, errorHandler);
      }, errorHandler);
      return true;
    }
    else {
      return _sendCommand('pkcs7sign', { certid: certid_, slot: slot_, data: data_, flag: flag_ }, successHandler, errorHandler);
    }
  }

  let _pkcs7SignDsig = function(certid_, slot_, data_, dsigurl_, flag_, successHandler, errorHandler) {
    // check minimum plugin version 1.3.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 3)) {
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

    // Version 2.0 and higher use WebExtension API and require to get PIN
    if (esmartTokenWebVersionInfo.major > 1) {
      _requestUserPinForOneSlots(slot_, 'userpin', function(slotsUserPin) {
        let payload = {
          certid: certid_,
          slot: parseInt(slot_),
          data: data_,
          flag: flag_,
          dsigurl: dsigurl_,
          pin: slotsUserPin[0].pin
        };
        _sendCommand('pkcs7sign', payload, successHandler, errorHandler);
      }, errorHandler);
      return true;
    }
    else {
      return _sendCommand('pkcs7sign',
          { certid: certid_, slot: slot_, data: data_, flag: flag_,  dsigurl: dsigurl_}, successHandler, errorHandler);
    }
  }

  let _pkcs7ItemBulkSign = function(bulkResult, successHandler, errorHandler) {
    if (bulkResult.result.totalSignatures <= bulkResult.result.successSignatures) {
      // stop procees
      _sendCommand('finishBulkOper', {}, function(res) {}, function(res) {});
      successHandler(JSON.stringify(bulkResult));
      return true;
    }
    else {
      let data_ = bulkResult.result.signatures[bulkResult.result.successSignatures];
      return _sendCommand('pkcs7BulkSignItem',
          { data: data_.data, flag: data_.flag,  dsigurl: bulkResult.result.dsigurl},
          function(res) {
            let obj = JSON.parse(res);
            if (obj.resp != 'OK') {
              successHandler(res);
              _sendCommand('finishBulkOper', {}, function(res) {}, function(res) {});
              return;
            }

            bulkResult.result.signatures[bulkResult.result.successSignatures].result = res;
            bulkResult.result.successSignatures++;

            if (typeof data_.successHandler != 'undefined') {
              // invoke callback
              if (!data_.successHandler(res)) {
                // callback signal to stop operartion
                _sendCommand('finishBulkOper', {}, function(res) {}, function(res) {});
                successHandler(JSON.stringify(bulkResult));
                return true;
              }
            }
            return _pkcs7ItemBulkSign(bulkResult, successHandler, errorHandler);
          }
          , errorHandler);
    }
  }

  let _pkcs7BulkSign = function(certid_, slot_, dsigurl_, signParamArray_, successHandler, errorHandler) {
    // check minimum plugin version 1.7.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 7)) {
      errorHandler("You should have plugin version 1.7.0 or higher to use this function.");
      return false;
    }

    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    if (!_pkcs7ValidateInParam(certid_, signParamArray_, errorHandler)) {
      return false;
    }

    if (!Array.isArray(signParamArray_) || signParamArray_.length == 0) {
      errorHandler("There is no data found for signing.");
    }

    // Version 2.0 and higher use WebExtension API and require to get PIN
    if (esmartTokenWebVersionInfo.major > 1) {
      return _requestUserPinForOneSlots(slot_, 'userpin', function(slotsUserPin) {
        let payload = {
          certid: certid_,
          slot: parseInt(slot_),
          dsigurl: dsigurl_,
          pin: slotsUserPin[0].pin
        };
        _sendCommand('initBulkOper', payload,
            function(res) {
              let bulkResult = {
                resp: 'OK',
                result: {
                  totalSignatures: signParamArray_.length,
                  successSignatures: 0,
                  signatures: signParamArray_,
                  dsigurl: dsigurl_
                }
              };

              let obj = JSON.parse(res);
              if (obj.resp != 'OK') {
                successHandler(res);
                _sendCommand('finishBulkOper', {}, function(res) {}, function(res) {});
                return;
              }

              return _pkcs7ItemBulkSign(bulkResult, successHandler, errorHandler);
            },
            errorHandler);
        return true;
      }, errorHandler);
    }

    let payload = {
      certid: certid_,
      slot: parseInt(slot_),
      dsigurl: dsigurl_
    };

    // init bulk operation
    return _sendCommand('initBulkOper',
        payload,
        function(res) {
          let bulkResult = {
            resp: 'OK',
            result: {
              totalSignatures: signParamArray_.length,
              successSignatures: 0,
              signatures: signParamArray_,
              dsigurl: dsigurl_
            }
          };

          let obj = JSON.parse(res);
          if (obj.resp != 'OK') {
            successHandler(res);
            _sendCommand('finishBulkOper', {}, function(res) {}, function(res) {});
            return;
          }

          return _pkcs7ItemBulkSign(bulkResult, successHandler, errorHandler);
        },
        errorHandler);
  }

  let _pkcs7Verify = function(signature_, data_, verifychain_, crls_, slot_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 1)) {
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
        { signature: signature_, slot: parseInt(slot_), data: data_, verifychain: verifychain_,  crls: crls_},
        successHandler, errorHandler);
  }

  let _pkcs7VerifyEx = function(signature_, data_, flag_, dsigurl_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.3.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 3)) {
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
        { signature: signature_, data: data_, flag: flag_, dsigurl: dsigurl_},
        successHandler, errorHandler);
  }

  let _sendCommand = function(cmd_, payload, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API
    if (esmartTokenWebVersionInfo.major > 1) {
      let requestId = cbQueue.registerCb(successHandler);
      window.postMessage({
        direction: "esmart-token-addon-message",
        message: JSON.stringify({ cmd: cmd_, data: payload }),
        requestid: requestId
      }, "*");
    }
    else {
      lastSuccessHandler = successHandler;
      let event = document.createEvent('CustomEvent');
      // TODO: deprecated function, need to be reviewed
      event.initCustomEvent("esmart-token-addon-message", true, true, { cmd: cmd_, data: payload });
      document.documentElement.dispatchEvent(event);
    }

    return true;
  }

  let _changeUserPin = function(slot_, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 2)) {
      errorHandler("You should have plugin version 1.2.0 or higher to use this function.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API and require to get PIN
    if (esmartTokenWebVersionInfo.major > 1) {
      return _requestUserPinForOneSlots(slot_, 'changeuserpin', function(slotsUserPin) {
        let payload = {
          slot: parseInt(slot_),
          pin: slotsUserPin[0].pin,
          newpin: slotsUserPin[0].newpin
        };
        _sendCommand('changeUserPin', payload, successHandler, errorHandler);
      }, errorHandler);
    }
    else {
      return _sendCommand('changeUserPin', { slot: slot_ }, successHandler, errorHandler);
    }
  }

  let _listData = function(isReadPrivateData, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 2)) {
      errorHandler("You should have plugin version 1.2.0 or higher to use this function.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API and require to get PIN
    if (esmartTokenWebVersionInfo.major > 1) {
      _requestUserPinForAllSlots(function(slotsUserPin) {
        let payload = {
          slotsData: slotsUserPin,
          readPrivate: true
        };
        _sendCommand('listData', payload, successHandler, errorHandler);
      }, errorHandler);
      return true;
    }
    else {
      return _sendCommand('listData', { readPrivate: true }, successHandler, errorHandler);
    }
  }

  let _saveData = function(slot_, dataLabel, dataValue, isPrivateData, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 1.1.0
    if (esmartTokenWebVersionInfo.major < 1 || (esmartTokenWebVersionInfo.major == 1 && esmartTokenWebVersionInfo.minor < 2)) {
      errorHandler("You should have plugin version 1.2.0 or higher to use this function.");
      return false;
    }

    if (dataLabel == '') {
      errorHandler("label can't be empty.");
      return false;
    }

    // Version 2.0 and higher use WebExtension API and require to get PIN
    if (esmartTokenWebVersionInfo.major > 1) {
      _requestUserPinForOneSlots(slot_, 'userpin', function(slotsUserPin) {
        let payload = {
          slot: parseInt(slot_),
          label: dataLabel,
          value: dataValue,
          isPrivate: isPrivateData,
          pin: slotsUserPin[0].pin
        };
        _sendCommand('saveData', payload, successHandler, errorHandler);
      }, errorHandler);
      return true;
    }
    else {
      return _sendCommand('saveData', { slot: slot_, label: dataLabel,
        value: dataValue, isPrivate: isPrivateData }, successHandler, errorHandler);
    }
  }

  let _setupMode  = function(_mode, _mode_data, successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 2.0.0
    if (esmartTokenWebVersionInfo.major < 2) {
      errorHandler("You should have plugin version 2.0.0 or higher to use this function.");
      return false;
    }

    if (_mode_data != 'undefined') {
      return _sendCommand('setupMode', { mode: _mode, mode_data: _mode_data}, successHandler, errorHandler);
    }
    else {
      return _sendCommand('setupMode', { mode: _mode}, successHandler, errorHandler);
    }
  }

  let _getMode = function(successHandler, errorHandler) {
    if (!isInit) {
      errorHandler("Not initializated.");
      return false;
    }

    // check minimum plugin version 2.0.0
    if (esmartTokenWebVersionInfo.major < 2) {
      errorHandler("You should have plugin version 2.0.0 or higher to use this function.");
      return false;
    }

    return _sendCommand('setupMode', {}, successHandler, errorHandler);
  }

  let _regExternalCallback = function(handlersArray) {
    externalHandlersArray = handlersArray;
  }

  let _findExternalCallback = function(name) {
    for (let i = 0; i < externalHandlersArray.length; ++i) {
      if (externalHandlersArray[i].name === name) {
        return externalHandlersArray[i].cb;
      }
    }
    return 'undefined';
  }

  let checkVersion = function() {
    if (navigator.userAgent.indexOf("Firefox") == -1) {
      return false;
    }
    let match = navigator.userAgent.match(/Firefox\/([0-9]+)\./);
    let ver = match ? parseInt(match[1]) : 0;
    if (ver == 0 || ver < 38) {
      return false;
    }
    return true;
  }

  return {
    init: function(successHandler, errorHandler) {
      return _init(successHandler, errorHandler);
    },
    listSlots: function(successHandler, errorHandler) {
      return _listSlots(successHandler, errorHandler);
    },
    listCerts: function(successHandler, errorHandler) {
      return _listCerts(successHandler, errorHandler);
    },
    listCertsEx: function(andOidFilterArray, orOidFilterArray, successHandler, errorHandler) {
      return _listCertsEx(andOidFilterArray, orOidFilterArray, successHandler, errorHandler);
    },
    pkcs7Sign: function(certid, slot, data, flag, successHandler, errorHandler) {
      return _pkcs7Sign(certid, slot, data, flag, successHandler, errorHandler);
    },
    pkcs7Verify: function(signature, data, verifychain, crls, slot, successHandler, errorHandler) {
      return _pkcs7Verify(signature, data, verifychain, crls, slot, successHandler, errorHandler);
    },
    pkcs7VerifyEx: function(signature, data, flag, dsigurl, successHandler, errorHandler) {
      return _pkcs7VerifyEx(signature, data, flag, dsigurl, successHandler, errorHandler);
    },
    changeUserPin: function(slot, successHandler, errorHandler) {
      return _changeUserPin(slot, successHandler, errorHandler);
    },
    listData: function(isReadPrivateData, successHandler, errorHandler) {
      return _listData(isReadPrivateData, successHandler, errorHandler);
    },
    saveData: function(slot, dataLabel, dataValue, isPrivateData, successHandler, errorHandler) {
      return _saveData(slot, dataLabel, dataValue, isPrivateData, successHandler, errorHandler);
    },
    pkcs7SignDsig: function(certid, slot, data, dsigurl, flag, successHandler, errorHandler) {
      return _pkcs7SignDsig(certid, slot, data, dsigurl, flag, successHandler, errorHandler);
    },
    pkcs7BulkSign: function(certid, slot, dsigurl, signParamArray, successHandler, errorHandler) {
      return _pkcs7BulkSign(certid, slot, dsigurl, signParamArray, successHandler, errorHandler);
    },
    setupHttpMode: function(serverName, serverPort, successHandler, errorHandler) {
      return _setupMode("HTTP", { server: serverName, port: serverPort }, successHandler, errorHandler);
    },
    setupNativeMode: function(successHandler, errorHandler) {
      return _setupMode("NATIVE", undefined, successHandler, errorHandler);
    },
    getMode: function(successHandler, errorHandler) {
      return _getMode(successHandler, errorHandler);
    },
    regExternalCallback: function(handlersArray) {
      return _regExternalCallback(handlersArray);
    }
  };
}();
module.exports = esmartTokenWeb;