import { resolve } from 'path';
import puppeteer, { Browser, ElementHandle, Page, Puppeteer } from 'puppeteer-core';
import { clearUserDataDirExitType, initLogger, waitTime } from '../util/tools';
import { clickElement, emulateClick } from '../service/emulate';
import { deceptionDetection, modifyCookies } from '../service/modify';
import fs from 'fs/promises';

// 初始化日志
initLogger();

// 保存 Cookie 到文件（带防抖）
let saveTimeout: NodeJS.Timeout;
let lastCookieString = '';

async function saveCookiesDebounced(page: Page, filename = 'cookies.json') {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const cookies = await page.cookies();
    await fs.writeFile(filename, JSON.stringify(cookies, null, 2));
    console.log(`💾 Cookies saved to ${filename} (${cookies.length} items)`);
  }, 1000); // 1秒内多次变化只保存一次
}

const injectCookieInterupt = async (page: Page) => {
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
  setInterval(async () => {
    try {
      const currentCookies = await page.cookies();
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

async function clearAllStorage(obj: { page: Page; browser: Browser }) {
  const { page, browser } = obj;
  // 1. 清除 Cookie
  // await page.deleteCookie(...(await page.cookies()));
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

// 处理原始数据
const handleOperateListData = (data: any) => {
  const target: any = {
    operateListData: [],
    customFn: {}, // 将所有的customFn全部放在这里，通过function1 2 3 4来对应
    lifeHooks: {}, // 生命周期钩子
  };
  let fnCount = 0;
  structuredClone(data).forEach((item: any) => {
    if (item?.previousLimit?.type === 'customFn') {
      const functionName = `function${++fnCount}`;
      target.customFn[functionName] = item.previousLimit.customFn;
      item.previousLimit.customFn = functionName;
    }
    if (item?.operateData?.type === 'customFn') {
      const functionName = `function${++fnCount}`;
      target.customFn[functionName] = item.operateData.customFn;
      item.operateData.customFn = functionName;
    }
    target.operateListData.push(item);
  });
  return target;
};

async function startSetting(props: TaskSetterData) {
  console.log('startSetting,');
  const launchParams: any = {
    defaultViewport: props.size || {
      width: 1920,
      height: 1080,
    },
    browserWSEndpoint: props.wsEndpoint,
    executablePath: props.chromePath,
  };
  const browser = await puppeteer.connect(launchParams);
  if (!browser) return;
  let operateListData: any[] = [];
  const page = await browser.newPage();

  await injectCookieInterupt(page);
  const targetId = (page.target() as any)._targetId;
  if (targetId) {
    process.send &&
      process.send({
        type: 'review',
        data: {
          targetId: targetId,
        },
      });
  }
  // 欺骗检测
  await deceptionDetection({
    page,
    browser,
  });
  // 修改cookies
  await modifyCookies({ page }, props.cookies);

  page.on('close', (target) => {
    clearAllStorage({
      page,
      browser,
    });
    process.exit();
  });
  return new Promise<Page>(async (resolve, reject) => {
    try {
      console.log('开始注入_junkpuppet_send_data');
      await page.exposeFunction('_junkpuppet_send_data', async (data: any) => {
        const dataJson = JSON.parse(data);
        console.log('_junkpuppet_send_data.recive', dataJson);
        try {
          if (dataJson.type === 'finishSetting') {
            operateListData = operateListData.concat(dataJson.operateListData);
            process.send &&
              process.send({
                type: 'finish',
                data: handleOperateListData(operateListData),
              });
            await page.close();
            // resolve('');
          } else if (dataJson.type === 'clickAndWaitNavigator') {
            const oldUrl = page.url();
            // click selector
            await clickElement(page, dataJson.data.selector);
            await waitTime(0.5);
            const newUrl = page.url();
            if (oldUrl === newUrl) {
              dataJson.operateListData[
                dataJson.operateListData.length - 1
              ].operateData.clickAndWaitNavigator.urlChange = false;
            }
            // urlChange不一定需要等待load事件 所以
            // 通过 readystatechange 判断是否需要等待 load 事件
            operateListData = operateListData.concat(dataJson.operateListData);
          } else if (dataJson.type === 'clickElement') {
            await emulateClick(page, dataJson.data.selector, dataJson.data.clickElement);
          } else if (dataJson.type === 'close') {
            await page.close();
          }
        } catch (e: any) {
          console.warn(e.message);
        }
      });
      console.log('开始跳转');

      await page.goto(props.targetUrl);
      resolve(page);
    } catch (e) {
      reject(e);
    }
  });
}

process.on('message', async (args: any) => {
  try {
    let page: Page | undefined;
    if (args.type === 'StartSetting') {
      page = await startSetting(args.params);
    } else if (args.type === 'closePage') {
      page?.close();
    }
  } catch (e: any) {
    console.error(e?.message);
  }
});
