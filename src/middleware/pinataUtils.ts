/**
 * Pinata cloud functions helper
 */

import Axios, { AxiosResponse } from 'axios';
// tslint:disable-next-line:no-var-requires
const FormData = require('form-data');
import fs = require('fs');

import ReadableStream = NodeJS.ReadableStream;
import config from '../config';

export const pinFile = (
  file: ReadableStream,
  filename: String,
  encoding: string,
): Promise<AxiosResponse> => {
  const data = new FormData();
  data.append('file', file, { filename, encoding });

  if (filename) {
    const metadata = JSON.stringify({
      name: filename,
    });
    data.append('pinataMetadata', metadata);
  }

  return Axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
    maxContentLength: Infinity, // this is needed to prevent Axios from throw error with large files
    headers: {
      'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
      pinata_api_key: config.get('PINATA_API_KEY') as string,
      pinata_secret_api_key: config.get('PINATA_SECRET_API_KEY') as string,
    },
  });
};
