var TinyVueProxy = require('./proxy')
var TinyVueParse = require('./parse')

/**
 * TinyVue class
 * @class
 * @param {Object} options
 * @param {HTMLElement} options.el - container box
 * @param {Object} options.data - props data
 * @param {HTMLElement} options.template - template
 */
var TinyVue = function(options) {
  Object.assign(this, options)

  // 初始化数据的订阅管理
  this.proxy = new TinyVueProxy(this)
  this.proxy.execute()

  // 解析模板并建立订阅关系
  this.parse = new TinyVueParse(this)
  this.parse.execute()
}

module.exports = TinyVue
