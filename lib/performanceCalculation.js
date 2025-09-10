/**
 * 性能指标计算原理与优化指南
 * 详细描述各种Web性能指标的计算方法、原理和公式，以及在Next.js和React中的优化方法
 */

const PERFORMANCE_METRICS_CALCULATION = {
  // 首次内容绘制 (First Contentful Paint)
  FCP: {
    name: '首次内容绘制',
    calculation: `
      FCP = 导航开始时间点 到 浏览器首次渲染DOM内容(文本、图像、非白色canvas或SVG)的时间点
    `,
    formula: `FCP = 首次渲染DOM内容的时间点 - 导航开始时间点`,
    apiUsage: `
      // 使用Performance API获取FCP
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      const fcpTime = fcpEntry ? fcpEntry.startTime : 0;
      
      // 使用PerformanceObserver监听FCP
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log('FCP:', entry.startTime);
          }
        }
      });
      paintObserver.observe({type: 'paint', buffered: true});
    `,
    nextjsOptimization: [
      '使用Next.js的服务端渲染(SSR)或静态生成(SSG)预渲染页面内容',
      '利用next/image组件自动优化图像加载',
      '使用next/font自动优化字体加载并避免布局偏移',
      '实现关键CSS内联，可通过自定义Document组件实现',
      '使用next/dynamic懒加载非关键组件',
      '合理配置Next.js的构建优化选项，如压缩和代码分割'
    ],
    reactOptimization: [
      '减少初始渲染的组件数量和复杂度',
      '使用React.lazy()和Suspense延迟加载非关键组件',
      '优化React组件的渲染性能，避免不必要的重渲染',
      '使用React.memo()缓存组件',
      '优化Context API的使用，避免不必要的重渲染'
    ]
  },
  
  // 最大内容绘制 (Largest Contentful Paint)
  LCP: {
    name: '最大内容绘制',
    calculation: `
      LCP测量视口内可见的最大内容元素(图像、视频、或大型文本块)完成渲染的时间。
      浏览器会在渲染过程中多次报告LCP，每当有更大的内容元素被渲染时就会更新。
      最终的LCP值是页面生命周期中报告的最后一个LCP时间。
    `,
    formula: `LCP = 最大内容元素完成渲染的时间点 - 导航开始时间点`,
    apiUsage: `
      // 使用PerformanceObserver监听LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1]; // 最新的LCP条目
        console.log('LCP:', lastEntry.startTime);
        console.log('LCP元素:', lastEntry.element);
      });
      lcpObserver.observe({type: 'largest-contentful-paint', buffered: true});
    `,
    nextjsOptimization: [
      '使用next/image组件优化关键图像的加载，设置priority属性',
      '实现图像预加载策略，特别是首屏大图像',
      '使用Next.js的自动图像优化功能，包括WebP/AVIF格式转换',
      '利用Next.js的自动静态优化，为静态页面生成HTML',
      '配置合适的缓存策略，利用Next.js的ISR(增量静态再生)功能',
      '优化服务器响应时间，使用Edge Runtime或优化API路由'
    ],
    reactOptimization: [
      '识别并优先加载LCP元素，通常是大型图像或文本块',
      '为图像设置适当的width和height属性，避免布局偏移',
      '使用现代图像格式如WebP，并提供合适的响应式图像',
      '实现渐进式图像加载策略',
      '减少阻塞渲染的JavaScript和CSS'
    ]
  },
  
  // 首次输入延迟 (First Input Delay)
  FID: {
    name: '首次输入延迟',
    calculation: `
      FID测量从用户首次与页面交互(如点击按钮)到浏览器能够响应该交互的时间。
      它只测量交互的延迟部分，不包括事件处理时间。
      FID只测量页面加载过程中的首次交互。
    `,
    formula: `FID = 浏览器响应首次交互的时间点 - 用户首次交互的时间点`,
    apiUsage: `
      // 使用PerformanceObserver监听FID
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const delay = entry.processingStart - entry.startTime;
          console.log('FID:', delay);
        }
      });
      fidObserver.observe({type: 'first-input', buffered: true});
    `,
    nextjsOptimization: [
      '使用Next.js的代码分割功能，减少初始JavaScript包大小',
      '利用next/script组件优化脚本加载策略，使用strategy属性',
      '实现组件级懒加载，使用next/dynamic',
      '优化第三方脚本的加载，延迟非关键脚本',
      '使用Next.js的服务端组件减少客户端JavaScript',
      '利用Next.js的自动静态优化减少客户端JavaScript'
    ],
    reactOptimization: [
      '拆分长任务，确保每个任务执行时间不超过50ms',
      '使用Web Workers处理复杂计算',
      '优化事件处理函数，使用节流(throttle)和防抖(debounce)',
      '使用React.memo()和useMemo()减少不必要的计算',
      '实现虚拟滚动处理长列表，如react-window或react-virtualized',
      '优化React状态管理，避免不必要的重渲染'
    ]
  },
  
  // 累积布局偏移 (Cumulative Layout Shift)
  CLS: {
    name: '累积布局偏移',
    calculation: `
      CLS测量页面整个生命周期中发生的所有意外布局偏移的累积分数。
      每次布局偏移的分数计算为 影响分数 * 距离分数。
      
      影响分数 = 不稳定元素的可见区域在两帧之间的可见区域的并集 / 视口总面积
      距离分数 = 不稳定元素移动的最大距离 / 视口的最大维度(宽度或高度，取较大值)
      
      最终CLS是所有布局偏移分数的总和。
    `,
    formula: `
      单次布局偏移分数 = 影响分数 * 距离分数
      CLS = 所有布局偏移分数的总和
    `,
    apiUsage: `
      // 使用PerformanceObserver监听CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            console.log('当前CLS:', clsValue);
          }
        }
      });
      clsObserver.observe({type: 'layout-shift', buffered: true});
    `,
    nextjsOptimization: [
      '使用next/image组件，它会自动设置图像尺寸，防止加载时的布局偏移',
      '使用next/font加载字体，它实现了字体显示策略，防止字体加载导致的布局偏移',
      '为所有多媒体元素(图像、视频)预先分配空间',
      '避免在已有内容上方插入内容',
      '使用CSS transform属性进行动画和过渡，而不是改变影响布局的属性',
      '使用Next.js的骨架屏或占位符组件'
    ],
    reactOptimization: [
      '为动态加载的内容预留空间，使用占位符或骨架屏',
      '避免使用自动调整大小的广告位',
      '实现正确的响应式设计，避免视口调整时的布局偏移',
      '使用固定大小的容器加载动态内容',
      '优化字体加载策略，使用font-display: optional或swap',
      '使用CSS Grid或Flexbox创建更稳定的布局'
    ]
  },
  
  // 交互到可用时间 (Time to Interactive)
  TTI: {
    name: '交互到可用时间',
    calculation: `
      TTI测量页面从开始加载到完全可交互所需的时间。
      完全可交互的定义是：
      1. 页面已显示有用内容(FCP已发生)
      2. 页面上的大多数可见元素已注册事件处理程序
      3. 页面能够在50毫秒内响应用户交互
      
      具体算法：
      1. 从FCP开始
      2. 向前搜索至少5秒的安静窗口(没有长任务且网络请求≤2个)
      3. 向后搜索安静窗口之前的最后一个长任务，如果没有找到长任务，则TTI等于FCP
      4. TTI是该长任务结束的时间
    `,
    formula: `TTI = 最后一个长任务结束的时间点 (在找到安静窗口之前)`,
    apiUsage: `
      // TTI需要使用web-vitals库或Lighthouse计算
      // 简化的伪代码示例:
      function calculateTTI(fcpTime, longTasks, networkRequests) {
        // 从FCP开始搜索
        let currentTime = fcpTime;
        
        // 寻找安静窗口(5秒无长任务且网络请求≤2)
        while (currentTime < navigationStart + pageLoadTime) {
          const windowEnd = currentTime + 5000;
          const tasksInWindow = longTasks.filter(task => 
            task.startTime >= currentTime && task.startTime < windowEnd
          );
          const requestsInWindow = networkRequests.filter(req => 
            req.startTime >= currentTime && req.startTime < windowEnd
          );
          
          if (tasksInWindow.length === 0 && requestsInWindow.length <= 2) {
            // 找到安静窗口，向后搜索最后一个长任务
            const taskBeforeWindow = longTasks.filter(task => 
              task.startTime < currentTime
            ).pop();
            
            return taskBeforeWindow 
              ? taskBeforeWindow.startTime + taskBeforeWindow.duration 
              : fcpTime;
          }
          
          currentTime += 50; // 增量搜索
        }
        
        return null; // 未找到TTI
      }
    `,
    nextjsOptimization: [
      '使用Next.js的代码分割和动态导入优化初始JavaScript包大小',
      '实现渐进式水合(Progressive Hydration)策略',
      '使用React Server Components减少客户端JavaScript',
      '优化客户端组件的初始渲染性能',
      '使用next/script的strategy属性控制脚本加载时机',
      '优先处理关键交互元素的JavaScript'
    ],
    reactOptimization: [
      '实现代码分割，使用React.lazy()和Suspense',
      '优化事件处理函数，避免在主线程上执行长时间运行的JavaScript',
      '使用useCallback()优化事件处理函数',
      '延迟加载非关键组件和功能',
      '优化React状态更新，批处理状态更新',
      '使用性能分析工具(如React Profiler)识别和优化性能瓶颈'
    ]
  },
  
  // 速度指数 (Speed Index)
  SI: {
    name: '速度指数',
    calculation: `
      速度指数测量页面内容在视觉上填充的速度。
      它通过计算页面加载过程中视觉完成度的进度来衡量。
      
      计算步骤：
      1. 捕获页面加载过程中的视频帧
      2. 对每一帧计算视觉完成度百分比(与最终加载完成的页面相比)
      3. 绘制视觉进度曲线(时间vs完成度)
      4. 计算曲线下的面积，得到速度指数
    `,
    formula: `
      Speed Index = ∫(1 - 视觉完成度(t)) dt
      从开始加载(t=0)到完全加载(t=完成时间)
    `,
    apiUsage: `
      // 速度指数通常需要使用Lighthouse或其他性能测试工具测量
      // 无法通过简单的JavaScript API直接获取
    `,
    nextjsOptimization: [
      '使用Next.js的图像优化功能，优化首屏图像加载',
      '实现渐进式渲染策略，优先渲染可视区域内容',
      '使用骨架屏或内容占位符提高感知性能',
      '优化关键渲染路径，减少阻塞资源',
      '利用Next.js的预渲染功能(SSG/SSR)加速初始内容显示',
      '实现资源优先级提示，如<link rel="preload">'
    ],
    reactOptimization: [
      '实现渐进式加载策略，先加载骨架屏，再填充内容',
      '优化React组件的初始渲染性能',
      '使用React.lazy()和Suspense实现组件级代码分割',
      '优先渲染首屏内容，延迟加载非关键内容',
      '使用CSS动画代替JavaScript动画，减少主线程负担',
      '优化图像加载策略，使用现代图像格式和响应式图像'
    ]
  },
  
  // 首字节时间 (Time to First Byte)
  TTFB: {
    name: '首字节时间',
    calculation: `
      TTFB测量从用户请求页面到接收到第一个字节的响应所需的时间。
      它包括DNS查找、TCP连接、SSL协商和服务器处理时间。
      
      TTFB组成部分：
      1. 重定向时间(如果有)
      2. DNS查找时间
      3. TCP连接时间
      4. SSL协商时间(如果使用HTTPS)
      5. 服务器处理时间
    `,
    formula: `
      TTFB = 请求开始时间 + 重定向时间 + DNS查找时间 + TCP连接时间 + SSL协商时间 + 服务器处理时间
    `,
    apiUsage: `
      // 使用Navigation Timing API获取TTFB
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      const ttfb = navigationEntry.responseStart;
      console.log('TTFB:', ttfb);
      
      // 更详细的计算
      const redirectTime = navigationEntry.redirectEnd - navigationEntry.redirectStart;
      const dnsTime = navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart;
      const tcpTime = navigationEntry.connectEnd - navigationEntry.connectStart;
      const sslTime = navigationEntry.secureConnectionStart > 0 ? 
        navigationEntry.connectEnd - navigationEntry.secureConnectionStart : 0;
      const serverTime = navigationEntry.responseStart - navigationEntry.requestStart;
      
      console.log('重定向时间:', redirectTime);
      console.log('DNS查找时间:', dnsTime);
      console.log('TCP连接时间:', tcpTime);
      console.log('SSL协商时间:', sslTime);
      console.log('服务器处理时间:', serverTime);
    `,
    nextjsOptimization: [
      '使用Next.js的Edge Runtime减少服务器响应时间',
      '实现有效的缓存策略，使用Next.js的ISR功能',
      '优化API路由的响应时间',
      '使用CDN分发静态资源和API响应',
      '优化数据获取逻辑，使用SWR或React Query进行客户端缓存',
      '使用Next.js的缓存机制，如fetch()的缓存选项',
      '优化服务器端数据库查询和外部API调用'
    ],
    reactOptimization: [
      '使用CDN分发静态资源',
      '实现有效的API缓存策略',
      '优化后端服务器性能',
      '减少重定向',
      '使用HTTP/2或HTTP/3',
      '优化DNS解析时间，使用DNS预取',
      '实现服务端渲染或静态生成'
    ]
  },
  
  // 完全加载时间 (Total Load Time)
  TLT: {
    name: '完全加载时间',
    calculation: `
      完全加载时间测量从导航开始到页面完全加载(包括所有资源)所需的时间。
      它是从导航开始到load事件触发的时间。
    `,
    formula: `TLT = load事件触发时间 - 导航开始时间`,
    apiUsage: `
      // 使用Navigation Timing API获取完全加载时间
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.startTime;
      console.log('完全加载时间:', loadTime);
    `,
    nextjsOptimization: [
      '使用Next.js的图像和字体优化功能',
      '实现资源的懒加载，使用next/dynamic和next/image的loading="lazy"',
      '优化和压缩静态资源，使用Next.js的内置优化',
      '减少不必要的客户端JavaScript，使用服务端组件',
      '使用next/script的strategy属性优化脚本加载',
      '实现有效的缓存策略',
      '使用Next.js的自动静态优化和增量静态再生(ISR)'
    ],
    reactOptimization: [
      '实现资源的懒加载',
      '优化和压缩静态资源',
      '减少HTTP请求数量',
      '使用浏览器缓存',
      '优化第三方资源的加载',
      '实现代码分割，使用React.lazy()和Suspense',
      '使用资源提示，如preload、prefetch和preconnect'
    ]
  },
  
  // 总阻塞时间 (Total Blocking Time)
  TBT: {
    name: '总阻塞时间',
    calculation: `
      TBT测量FCP和TTI之间所有长任务(超过50ms)阻塞主线程的总时间。
      对于每个长任务，阻塞时间是任务持续时间减去50ms的基准时间。
      
      例如，如果有一个70ms的任务，它的阻塞时间是70ms - 50ms = 20ms。
    `,
    formula: `
      单个长任务的阻塞时间 = 任务持续时间 - 50ms (如果任务持续时间 > 50ms)
      TBT = FCP和TTI之间所有长任务的阻塞时间总和
    `,
    apiUsage: `
      // 使用Long Tasks API和Performance Timeline API计算TBT
      let totalBlockingTime = 0;
      let fcpTime = 0;
      let ttiTime = Infinity; // 假设我们已经计算出了TTI
      
      // 获取FCP时间
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        fcpTime = fcpEntry.startTime;
      }
      
      // 监听长任务
      const longTaskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // 只计算FCP和TTI之间的长任务
          if (entry.startTime >= fcpTime && entry.startTime < ttiTime) {
            const blockingTime = entry.duration - 50;
            if (blockingTime > 0) {
              totalBlockingTime += blockingTime;
            }
          }
        }
        console.log('当前TBT:', totalBlockingTime);
      });
      longTaskObserver.observe({type: 'longtask', buffered: true});
    `,
    nextjsOptimization: [
      '使用React Server Components减少客户端JavaScript执行',
      '实现代码分割，使用next/dynamic懒加载组件',
      '优化JavaScript执行，避免长任务',
      '将复杂计算移至Web Workers',
      '优化第三方脚本加载，使用next/script的strategy属性',
      '延迟加载非关键JavaScript',
      '使用React.memo()和useMemo()减少不必要的计算'
    ],
    reactOptimization: [
      '拆分长任务为更小的异步任务',
      '使用requestIdleCallback()在浏览器空闲时执行非关键任务',
      '优化React渲染性能，避免不必要的重渲染',
      '使用Web Workers处理复杂计算',
      '实现虚拟滚动处理长列表',
      '优化事件处理函数，使用节流和防抖',
      '使用React Profiler识别和优化性能瓶颈'
    ]
  }
};

// Next.js和React通用性能优化策略
const GENERAL_OPTIMIZATION_STRATEGIES = {
  nextjs: [
    {
      category: '服务端渲染与静态生成',
      techniques: [
        '根据页面类型选择适当的渲染策略(SSR、SSG、ISR或CSR)',
        '使用getStaticProps预渲染静态页面，减少TTFB和FCP',
        '使用getServerSideProps处理需要最新数据的页面',
        '实现增量静态再生(ISR)，平衡性能和数据新鲜度',
        '使用React Server Components减少客户端JavaScript'
      ]
    },
    {
      category: '资源优化',
      techniques: [
        '使用next/image自动优化图像(调整大小、格式转换、懒加载)',
        '使用next/font优化字体加载和显示',
        '使用next/script控制脚本加载策略',
        '实现有效的缓存策略，包括静态资源和API响应',
        '使用next/dynamic实现组件级代码分割和懒加载'
      ]
    },
    {
      category: '构建优化',
      techniques: [
        '使用next.config.js配置webpack优化选项',
        '启用Next.js的生产模式构建优化',
        '实现模块联邦(Module Federation)共享代码',
        '优化依赖管理，减少包大小',
        '使用bundle analyzer分析和优化包大小'
      ]
    },
    {
      category: '数据获取与API',
      techniques: [
        '使用SWR或React Query实现客户端数据缓存和重新验证',
        '优化API路由的响应时间',
        '实现API响应缓存',
        '使用Edge Runtime加速API响应',
        '优化数据库查询和外部API调用'
      ]
    },
    {
      category: '部署与基础设施',
      techniques: [
        '使用Vercel或其他Next.js优化的托管平台',
        '实现全球CDN分发',
        '使用Edge Functions处理地理位置相关的逻辑',
        '启用HTTP/2或HTTP/3',
        '实现有效的浏览器缓存策略'
      ]
    }
  ],
  
  react: [
    {
      category: '渲染优化',
      techniques: [
        '使用React.memo()避免不必要的组件重渲染',
        '使用useMemo()缓存计算结果',
        '使用useCallback()缓存事件处理函数',
        '实现虚拟滚动处理长列表(react-window, react-virtualized)',
        '优化Context API的使用，避免不必要的重渲染',
        '使用React Profiler识别和优化性能瓶颈'
      ]
    },
    {
      category: '代码分割与懒加载',
      techniques: [
        '使用React.lazy()和Suspense实现组件级代码分割',
        '实现路由级代码分割',
        '懒加载非关键组件和功能',
        '预加载即将需要的组件',
        '实现渐进式加载策略'
      ]
    },
    {
      category: '状态管理',
      techniques: [
        '选择适当的状态管理解决方案(Context API, Redux, Zustand等)',
        '实现状态规范化，避免重复数据',
        '使用不可变数据结构优化状态更新',
        '实现状态分片，避免全局状态更新',
        '优化Redux store的结构和更新逻辑'
      ]
    },
    {
      category: '资源优化',
      techniques: [
        '优化图像加载(懒加载、响应式图像、现代格式)',
        '优化字体加载策略',
        '延迟加载非关键CSS',
        '优化第三方脚本加载',
        '使用资源提示(preload, prefetch, preconnect)'
      ]
    },
    {
      category: '构建优化',
      techniques: [
        '使用生产模式构建',
        '启用代码分割和树摇(Tree Shaking)',
        '优化依赖管理，减少包大小',
        '使用webpack Bundle Analyzer分析和优化包大小',
        '实现有效的缓存策略'
      ]
    }
  ]
};

export { PERFORMANCE_METRICS_CALCULATION, GENERAL_OPTIMIZATION_STRATEGIES };