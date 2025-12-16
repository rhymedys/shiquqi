import fs from 'fs/promises';
import { noop } from 'lodash';
import { CookieData, Page } from 'puppeteer-core';
import { IPage } from '../interface/base';
// import psl from 'psl';

// 保存 Cookie 到文件（带防抖）
let lastCookieString = '';
const pageMap: {
  [key: string]: any;
} = {};

export const invokeClearSaveInterval = (page: IPage) => {
  if (pageMap[page.dhPageId]?.interval) {
    clearInterval(pageMap[page.dhPageId].interval);
    delete pageMap[page.dhPageId].interval;
  }
};

export const invokeClearTimeout = (page: IPage) => {
  if (pageMap[page.dhPageId]?.timeout) {
    clearTimeout(pageMap[page.dhPageId].timeout);
    delete pageMap[page.dhPageId].timeout;
  }
};

const invokeInitPageMap = (page: IPage) => {
  if (!pageMap[page.dhPageId]) {
    pageMap[page.dhPageId] = {};
  }
};

export const invokeSaveCookie = async (page: IPage, filename = 'cookies.json') => {
  //   const hostname = new URL(page.url()).hostname;

  //   const domain = psl.get(new URL(page.url()).hostname);
  //   console.log('psl.domain');
  //   filename = `${domain}.${filename}`;
  const cookies = await page.browserContext().cookies();
  //   const domainCookies = cookies.filter(
  //     (cookie) => (domain && cookie.domain.includes(domain)) || cookie.domain === '.' + domain,
  //   );
  await fs.writeFile(filename, JSON.stringify(cookies, null, 2));
  console.log(`💾 Cookies saved to ${filename} (${cookies.length} items)`);
};

export const invokeGetCookieFromConfig = async (page: Page, filename = 'cookies.json') => {
  //   const cookies = await page.browserContext();
  //   new URL(page.url()).hostname
  //   return cookies;

  try {
    let res: string | CookieData[] = await fs.readFile(filename, 'utf-8');
    res = JSON.parse(res) as CookieData[];
    await page.browserContext().setCookie(...res);
  } catch (error) {
    console.log('❌ Failed to read cookies:', error);
  }
};

export async function saveCookiesDebounced(page: IPage) {
  // //   page;
  invokeInitPageMap(page);
  invokeClearTimeout(page);
  pageMap[page.dhPageId].timeout = setTimeout(invokeSaveCookie.bind(noop, page)); // 1秒内多次变化只保存一次
}

export const injectCookieInterupt = async (page: IPage) => {
  invokeInitPageMap(page);
  page.on('response', async (response) => {
    const headers = response.headers();
    if (headers['set-cookie']) {
      console.log('🆕 [HTTP] Detected Set-Cookie from:', response.url());
      await saveCookiesDebounced(page);
    }
  });

  // await page.evaluateOnNewDocument(() => {
  //   // 保存原始 setter
  //   const originalSetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')?.set;

  //   // 重写 cookie setter
  //   Object.defineProperty(document, 'cookie', {
  //     set(value) {
  //       console.log('🆕 [JS] document.cookie set to:', value);
  //       // 通知 Puppeteer（通过 console.log 触发监听）
  //       // 注意：这里无法直接调用 Node.js 函数，需通过事件通信
  //       originalSetter?.call(document, value);
  //     },
  //     get() {
  //       return originalSetter ? document.cookie : '';
  //     },
  //     configurable: true,
  //   });
  // });

  // ==============================
  // 3. （可选）定期轮询确保不漏（兜底）
  // ==============================
  pageMap[page.dhPageId].interval = setInterval(async () => {
    try {
      const currentCookies = await page.browserContext().cookies();
      const currentStr = JSON.stringify(currentCookies);
      if (currentStr !== lastCookieString) {
        lastCookieString = currentStr;
        await saveCookiesDebounced(page);
      }
    } catch (e) {
      // 页面可能已关闭
    }
  }, 3000);
};

export async function clearAllStorage(obj: { page: IPage }) {
  const { page } = obj;
  // 1. 清除 Cookie
  // await page.deleteCookie(...(await page.cookies()));
  invokeClearTimeout(page);
  invokeClearSaveInterval(page);

  await invokeSaveCookie(page);

  const browser = page.browserContext();
  await browser.deleteCookie(...(await browser.cookies()));

  console.log('🍪 Cookies cleared');
  // // 2. 清除 LocalStorage / SessionStorage
  // await page.evaluate(() => {
  //   localStorage.clear();
  //   sessionStorage.clear();
  // });
  // console.log('📦 LocalStorage & SessionStorage cleared');

  // // 3. 清除 IndexedDB（需遍历并删除所有数据库）
  // await page.evaluate(async () => {
  //   const dbs = await indexedDB.databases();
  //   for (const db of dbs) {
  //     if (db.name) {
  //       indexedDB.deleteDatabase(db.name);
  //     }
  //   }
  // });
  // console.log('🗃️ IndexedDB cleared');

  // // 4. 清除 Cache Storage（Service Worker 缓存）
  // await page.evaluate(async () => {
  //   if ('caches' in window) {
  //     const cacheNames = await caches.keys();
  //     for (const name of cacheNames) {
  //       await caches.delete(name);
  //     }
  //   }
  // });
  // console.log('🌐 Cache Storage cleared');

  // // 5. （可选）清除 WebSQL（已废弃，但某些老站可能用）
  // await page.evaluate(() => {
  //   if (window.openDatabase) {
  //     // WebSQL 无法直接清空，但可忽略（现代网站基本不用）
  //   }
  // });
}
