import {cache} from 'react';

/** One clock snapshot for all server-rendered sections in the same request. */
export const requestTime = cache(() => Date.now());
