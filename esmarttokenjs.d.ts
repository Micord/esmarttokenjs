declare module 'esmarttokenjs' {
  export interface esmarttokenjs {
    init(successHandler, errorHandler): any;

    listSlots(successHandler, errorHandler): any;

    pkcs7Sign(certid, slot, data, flag, successHandler, errorHandler): any;

    pkcs7SignDsig(certid, slot, data, dsigurl, flag, successHandler, errorHandler): any

    pkcs7Verify(signature, data, verifychain, crls, slot, successHandler, errorHandler): any;

    pkcs7VerifyEx(signature, data, flag, dsigurl, successHandler, errorHandler): any;

    sendCommand(cmd, payload, successHandler, errorHandler): any;

    changeUserPin(slot, successHandler, errorHandler): any;

    listData(isReadPrivateData, successHandler, errorHandler): any;

    saveData(slot, dataLabel, dataValue, isPrivateData, successHandler, errorHandler): any;

    listCertsEx(andOidFilterArray, orOidFilterArray, successHandler, errorHandler): any;

    pkcs7BulkSign(certid, slot, dsigurl, signParamArray, successHandler, errorHandler):any;

    regExternalCallback(handlersArray);
  }
}