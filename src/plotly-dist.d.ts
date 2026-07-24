// @types/plotly.js only ships typings for the 'plotly.js' module specifier —
// this re-exports them for the prebuilt dist bundle path actually imported at
// runtime (see the comment in lib/windroseConfig.ts for why that path is used).
declare module 'plotly.js/dist/plotly' {
  export * from 'plotly.js'
}
