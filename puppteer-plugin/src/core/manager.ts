import puppeteer from 'puppeteer-core';
import { clearUserDataDirExitType, initLogger } from '../util/tools';
import { resolve } from 'path';
import { clearAllStorage } from '../util/cookies';
import { IPage } from '../interface/base';
const IS_DEV = process.argv[1].includes('setting.ts');
const DEV_EXTENSION_PATH = resolve(__dirname, '../setter-extension/setter-dist');
const PRO_EXTENSION_PATH = resolve(__dirname, './setter-dist');
// const EXTENSION_PATH = IS_DEV ? DEV_EXTENSION_PATH : PRO_EXTENSION_PATH;
const EXTENSION_PATH = DEV_EXTENSION_PATH;
// 初始化日志
initLogger();

async function initBrowser(props: any) {
  console.log('process.argv[1]', process.argv[1]);

  // let EXTENSION_PATH = resolve(__dirname, '..', 'test');
  console.log('EXTENSION_PATH', EXTENSION_PATH);

  const launchParams: any = {
    headless: 'new', // 👈 关键！显示浏览器窗口
    args: [
      // `--load-extension=${EXTENSION_PATH}`,
      // `--disable-extensions-except=${EXTENSION_PATH}`,
      '--remote-debugging-pipe',
      '--remote-debugging-port=9222',
      '--remote-allow-origins=*',
    ],
    protocol: 'cdp',
    executablePath: props.chromePath,
    // headless: false,
    // defaultViewport: props.size || {
    //   width: 1920,
    //   height: 1080,
    // },
    // pipe: true,
    enableExtensions: [EXTENSION_PATH],
    // args: [
    //   // '--start-maximized',
    //   // `--disable-extensions-except=${EXTENSION_PATH}`,
    //   // `--load-extension=${EXTENSION_PATH}`,
    //   // // '--remote-allow-origins=*',
    //   // '--remote-debugging-port=9222',
    //   // '--enable-automation',
    //   // '--disable-web-security',
    //   // '--disable-features=ExtensionsToolbarMenu',
    //   // '--allow-http-screen-capture',
    //   // '--allow-cross-origin-auth-prompt',
    //   // '--disable-site-isolation-trials',
    //   // '--disable-blink-features=AutomationControlled',
    //   // '--enable-unsafe-swiftshader',
    //   // '--ignore-certificate-errors',
    //   // '--no-default-browser-check',
    //   // '--no-first-run',
    //   // '--disable-default-apps',
    //   // '--disable-translate',
    //   // '--disable-dev-shm-usage',
    // ],
    ignoreDefaultArgs: ['--enable-automation'],
  };

  console.log('launchParams', launchParams);
  if (props.chromeDataPath) {
    await clearUserDataDirExitType(props.chromeDataPath);
    launchParams.userDataDir = props.chromeDataPath;
  }
  const browser = await puppeteer.launch(launchParams);

  const [page] = await browser.pages();
  await page.setContent(
    '<!DOCTYPE html><html><head><meta charset=utf-8><title>欢迎使用DataHound</title><style>html,body{height: 100%; overflow: hidden;}</style></head><body><div style="font-size: 56px; height: 100%; display: flex; align-items: center; justify-content: center;">' +
      '' +
      '欢迎使用DataHound</div></body></html>',
  );

  browser.on('disconnected', (target) => {
    // browser意外退出
    console.log('browser disconnected');
  });

  let wsEndpoint = browser.wsEndpoint();

  if (!wsEndpoint) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        console.log('res', data);

        if (data?.webSocketDebuggerUrl) {
          // override the wsEndpoint with the debugger url returned by the debug server
          // (ignore TS if wsEndpoint was declared as const)
          // @ts-ignore
          wsEndpoint = data.webSocketDebuggerUrl;
        }
      } else {
        console.warn('Failed to fetch /json/version, status:', res.status);
      }
    } catch (err) {
      console.warn('Error fetching /json/version:', err);
    }
  }

  console.log('wsEndpoint', wsEndpoint);

  return wsEndpoint;
}

async function activeTargetPage(props: any, pageId: string) {
  const launchParams: any = {
    executablePath: props.chromePath,
    headless: 'new',
    defaultViewport: props.size || {
      width: 1920,
      height: 1080,
    },
    browserWSEndpoint: props.wsEndpoint,
  };
  const browser = await puppeteer.connect(launchParams);
  const pages = await browser.pages();
  const targetPage = pages.find((item: any) => {
    return item.target()._targetId === pageId;
  });
  targetPage!.bringToFront();
  return browser.wsEndpoint();
}

async function closeTargetPage(props: any, pageId: string) {
  const launchParams: any = {
    executablePath: props.chromePath,
    headless: 'new',
    defaultViewport: props.size || {
      width: 1920,
      height: 1080,
    },
    browserWSEndpoint: props.wsEndpoint,
  };
  const browser = await puppeteer.connect(launchParams);
  const pages = await browser.pages();
  const targetPage = pages.find((item: any) => {
    return item.target()._targetId === pageId;
  });
  // targetPage?.coo
  if (targetPage) {
    clearAllStorage({
      page: targetPage as IPage,
    });
    targetPage.close();
  }

  return browser.wsEndpoint();
}

process.on('message', async (args: any) => {
  try {
    if (args.type === 'initBrowser') {
      const result = await initBrowser(args.params);
      process.send &&
        process.send({
          type: 'wsEndpoint',
          data: result,
        });
    } else if (args.type === 'activeTargetPage') {
      const result = await activeTargetPage(args.params, args.params.pageId);
      process.send &&
        process.send({
          type: 'activeTargetPage',
          data: result,
        });
    } else if (args.type === 'closeTargetPage') {
      const result = await closeTargetPage(args.params, args.params.pageId);
      process.send &&
        process.send({
          type: 'closeTargetPage',
          data: result,
        });
    }
  } catch (e: any) {
    console.error(e?.message);
    process.exit();
  }
});
