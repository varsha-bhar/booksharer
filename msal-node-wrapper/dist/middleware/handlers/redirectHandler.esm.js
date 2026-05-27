/*! msal-node-wrapper v1.0.0-beta 2024-02-02 */
'use strict';
import { ErrorMessages } from '../../utils/Constants.esm.js';
import { StringUtils } from '../../node_modules/@azure/msal-common/dist/utils/StringUtils.esm.js';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function redirectHandler() {
    return async (req, res, next) => {
        this.getLogger().trace("redirectHandler called");
        const payload = req.method === "GET" ? req.query : req.body;
        if (!payload || !payload.code) {
            return next(new Error(ErrorMessages.AUTH_CODE_RESPONSE_NOT_FOUND));
        }
        const tokenRequest = {
            ...req.session.tokenRequestParams,
            code: payload.code
        };
        try {
            const msalInstance = this.getMsalClient();
            if (req.session.tokenCache) {
                msalInstance.getTokenCache().deserialize(req.session.tokenCache);
            }
            const tokenResponse = await msalInstance.acquireTokenByCode(tokenRequest, payload);
            req.session.tokenCache = msalInstance.getTokenCache().serialize();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            req.session.account = tokenResponse.account; // account will never be null in this grant type
            req.session.isAuthenticated = true;
            const { redirectTo } = payload.state ?
                StringUtils.jsonParseHelper(this.getCryptoProvider().base64Decode(payload.state))
                :
                    { redirectTo: "/" };
            res.redirect(redirectTo);
        }
        catch (error) {
            next(error);
        }
    };
}

export { redirectHandler as default };
//# sourceMappingURL=redirectHandler.esm.js.map
