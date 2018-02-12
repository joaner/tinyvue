var Proxy = require('./proxy')
var Parse = require('./parse')

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

  this.proxy = new Proxy(this)
  this.proxy.execute()

  this.parse = new Parse(this)
  this.parse.execute()

  window.t = this
}

module.exports = TinyVue
