# tiny Vue

a tiny MVVM framework like Vue.js

> 简单的实现了订阅发布模式，帮助理解Vue.js的实现

## Usage

```html
<!-- container -->
<div id="app"></div>

<!-- template -->
<template id="template1">
  <button v-click="this.checked = !this.checked">
    trun <expression>this.checked ? 'off' : 'on' </expression>
  </button>
  <span v-show="this.checked">hello world!</span>
</template>

<script src="/dist/tinyvue.js"></script>
<script>
new TinyVue({
  el: document.getElementById('app'),
  template: document.getElementById('template1').content,
  data: {
    checked: false,
  }
})
</script>
```

## Reference

### TinyVue

`src/index.js`

入口，实例属性供其它类使用

实例属性，同时也是实例化的参数：
- `el` `HTMLElement` 容器
- `data` `Object` 属性
- `template` `HTMLElement` DOM模板

### TinyVueProxy

`src/proxy.js`

订阅管理类，负责订阅管理，在属性修改后触发回调

实例属性：
- `currentDep` 表示该方法依赖于当前读取的属性，由此实现订阅
- `deps` 用来管理属性的订阅列表

### TinyVueParse

`src/parse.js`

解析模板中的表达式，并通过第一次执行表达式来建立订阅关系

- 支持的指令有：`v-if`, `v-show`, `v-click`
- 内容表达式需要用 `<expression>` 标签包含，暂不支持 `{{ expression }}` 这种

## Contributing

还在不断完善中，欢迎补充或建议
