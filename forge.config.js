module.exports = {
  packagerConfig: {
    asar: true,
    name: 'DBHound',
    icon: 'public/robot',
    asarUnpack: [
      'node_modules/better-sqlite3/**/*', // 👈 必须包含
    ],
    ignore: (url) => {
      if (
        !url.startsWith('/') ||
        url.startsWith('/dist') ||
        url.startsWith('/dist-eletron') ||
        url.startsWith('/node_modules') ||
        url.startsWith('/public') ||
        url.startsWith('/package.json')
      ) {
        return false;
      } else {
        return true;
      }
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      // config: {
      //   iconUrl:
      //     "C:\\Users\\admin\\Desktop\\electron-box\\electrondemo\\public\\robot.ico",
      //   setupIcon:
      //     "C:\\Users\\admin\\Desktop\\electron-box\\electrondemo\\public\\robot.ico",
      // },
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // {
    //   name: '@electron-forge/plugin-webpack',
    //   config: {
    //     mainConfig: './webpack.main.config.js',
    //     renderer: {
    //       config: './webpack.renderer.config.js',
    //       entryPoints: [{
    //         html: './src/renderer/index.html',
    //         js: './src/renderer/index.js',
    //         name: 'main_window'
    //       }]
    //     }
    //   }
    // }
  ],
};
