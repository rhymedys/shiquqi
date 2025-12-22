import { resolve } from 'path';
import puppeteer, { Browser, ElementHandle, Page, Puppeteer } from 'puppeteer-core';
import { clearUserDataDirExitType, initLogger, waitTime } from '../util/tools';
import { clickElement, emulateClick } from '../service/emulate';
import { deceptionDetection, modifyCookies } from '../service/modify';
import fs from 'fs/promises';
import { clearAllStorage, injectCookieInterupt, invokeGetCookieFromConfig } from '../util/cookies';
import { invokeNewPage } from '../util/page';
import { IPage } from '../interface/base';

// 初始化日志
initLogger();

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
  const page = await invokeNewPage(browser);

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
  // await modifyCookies({ page }, props.cookies);
  await invokeGetCookieFromConfig(page);

  page.on('close', (target) => {
    clearAllStorage({
      page,
    });
    process.exit();
  });
  return new Promise(async (resolve, reject) => {
    try {
      console.log('开始注入_dbhound_send_data');
      await page.exposeFunction('_dbhound_send_data', async (data: any) => {
        const dataJson = JSON.parse(data);
        console.log('_dbhound_send_data.recive', dataJson);
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
    // let page: IPage | undefined;
    if (args.type === 'StartSetting') {
      await startSetting(args.params);
    }
  } catch (e: any) {
    console.error(e?.message);
  }
});
