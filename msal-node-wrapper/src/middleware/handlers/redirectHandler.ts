/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import { StringUtils } from "@azure/msal-common";
import { AuthorizationCodePayload, AuthorizationCodeRequest } from "@azure/msal-node";
import { WebAppAuthProvider } from "../../provider/WebAppAuthProvider";
import { AppState } from "../MiddlewareOptions";
import { ErrorMessages } from "../../utils/Constants";

function redirectHandler(this: WebAppAuthProvider): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        this.getLogger().trace("redirectHandler called");

        const payload = req.method === "GET" ? req.query : req.body;

        if (!payload || !payload.code) {
            return next(new Error(ErrorMessages.AUTH_CODE_RESPONSE_NOT_FOUND));
        }

        const tokenRequest = {
            ...req.session.tokenRequestParams,
            code: payload.code as string
        } as AuthorizationCodeRequest;

        try {
            const msalInstance = this.getMsalClient();

            if (req.session.tokenCache) {
                msalInstance.getTokenCache().deserialize(req.session.tokenCache);
            }

            const tokenResponse = await msalInstance.acquireTokenByCode(
                tokenRequest,
                payload as AuthorizationCodePayload
            );

            req.session.tokenCache = msalInstance.getTokenCache().serialize();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            req.session.account = tokenResponse.account!; // account will never be null in this grant type
            req.session.isAuthenticated = true;

            const { redirectTo } = payload.state ?
                StringUtils.jsonParseHelper(
                    this.getCryptoProvider().base64Decode(payload.state as string)
                ) as AppState
                :
                { redirectTo: "/" };

            res.redirect(redirectTo);
        } catch (error) {
            next(error);
        }
    };
}

export default redirectHandler;
