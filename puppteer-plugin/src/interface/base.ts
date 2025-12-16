import { Page } from 'puppeteer-core';

export interface IPage extends Page {
  dhPageId: string;
}
