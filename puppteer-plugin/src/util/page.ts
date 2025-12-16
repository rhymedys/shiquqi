import { nanoid } from 'nanoid';
import { Browser } from 'puppeteer-core';
import { IPage } from '../interface/base';

const pageMap = {};

export const invokeNewPage = async (browser: Browser) => {
  const page = (await browser.newPage()) as IPage;

  page.dhPageId = nanoid();

  return page;
};
