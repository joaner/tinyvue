(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.TinyVue = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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

  // 装载到容器并显示
  while (this.el.firstChild) {
    this.el.removeChild(this.el.firstChild);
  }
  this.el.appendChild(this.template)
}

module.exports = TinyVue

},{"./parse":2,"./proxy":3}],2:[function(require,module,exports){
/**
 * parse template and execute expression
 * 解析模板并执行表达式，建立订阅关系
 * @class
 * @param {TinyVue} vue - instance
 */
var TinyVueParse = function(vue) {
  this.vue = vue
}

/**
 * 解析模板并渲染显示
 */
TinyVueParse.prototype.execute = function() {
  for (var i = 0; i < this.vue.template.childNodes.length; i++) {
    this.parseElement(this.vue.template.childNodes[i])
  }
}

/**
 * 执行表达式
 * TODO 还不支持多行表达式
 */
TinyVueParse.prototype.execExpression = function(expression) {
  var method = new Function('return ' + expression)
  return method.call(this.vue.data)
}

/**
 * 递归解析DOM节点
 * @param {HTMLElement} node - 标签节点
 */
TinyVueParse.prototype.parseElement = function(node) {
  // 只需要处理标签节点
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return
  }

  var self = this

  // 解析属性表达式
  if (node.hasAttributes()) {
    for (var i = 0; i < node.attributes.length; i++) {
      this.parseAttribute(node.attributes[i], node)
    }
  }

  if (node.hasChildNodes()) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var childNode = node.childNodes[i]

      // 此标签的内容为表达式
      // TODO 不支持解析 {{ expression }} 这样的表达式，因为和其它文本内容混合不好拆分
      if (childNode.nodeName === 'EXPRESSION') {
        self.vue.proxy.currentDep = (function(expression, childNode) {
          return function() {
            // 每次计算表达式，
            childNode.textContent = self.execExpression(expression)
          }
        })(childNode.textContent, childNode)

        self.vue.proxy.currentDep()

        self.vue.proxy.currentDep = null
      } else {
        // 递归解析子标签节点
        this.parseElement(childNode)
      }
    }
  }
}

/**
 * 解析属性上的表达式
 * @param {Attr} attribute - 属性节点
 * @param {HTMLElement} node - 所属标签节点
 */
TinyVueParse.prototype.parseAttribute = function(attribute, node) {
  // 只处理 v-* 开头的属性
  if (attribute.name.indexOf('v-') !== 0) {
    return
  }

  var self = this

  // 指令名
  var directive = attribute.name.slice(2)

  var currentDep

  switch (directive) {
    case 'if':
      // v-if里要替换的emptyNode
      var emptyNode = new Comment()
      currentDep = function() {
        var result = self.execExpression(attribute.value)
        if (!result) {
          if (node.parentNode) {
            node.parentNode.replaceChild(emptyNode, node)
          }
        } else {
          if (emptyNode.parentNode) {
            emptyNode.parentNode.replaceChild(node, emptyNode)
          }
        }
      }
      break
    case 'show':
      currentDep = function() {
        var result = self.execExpression(attribute.value)
        node.style.display = result ? null : 'none'
      }
      break
    case 'click':
      currentDep = function() {
        node.addEventListener(directive, function() {
          self.execExpression(attribute.value)
        })
      }
      break
    default:
      // unsupport directive
      return
  }

  // 每次属性变化，都要执行的订阅方法
  self.vue.proxy.currentDep = currentDep

  // 初始执行一次表达式，通过读取属性，来建立订阅关系
  // 参见 proxy.js 的 Object,defineProperty get方法
  self.vue.proxy.currentDep()

  // 关系建立完后重置
  self.vue.proxy.currentDep = null
}

module.exports = TinyVueParse

},{}],3:[function(require,module,exports){
/**
 * 数据的订阅管理
 * @class
 * @param {TinyVue} vue - app instance
 */
var TinyVueProxy = function(vue) {
  this.vue = vue
  this.data = vue.data

  this.deps = {}
  this.currentDep = null
}

/**
 * 对数据的初始化绑定
 */
TinyVueProxy.prototype.execute = function() {
  for (name in this.data) {
    this.proxy(name)
  }

  for (name in this.vue.watch) {
    this.watch(name, this.vue.watch[name])
  }

  for (name in this.vue.computed) {
    this.proxyComputed(name, this.vue.computed[name])
  }
}

/**
 * 订阅属性被修改后的回调
 * @param {string} name - 属性名
 * @param {Function} callback - 回调，比如执行依赖的表达式
 */
TinyVueProxy.prototype.watch = function(name, callback) {
  if (!this.deps[name]) {
    this.deps[name] = []
  }
  this.deps[name].push(callback)
}

/**
 * 初始化属性的订阅方法
 * @param {string} name - 属性名
 */
TinyVueProxy.prototype.proxy = function(name) {
  var self = this

  var value = this.data[name]

  Object.defineProperty(this.data, name, {
    get: function() {
      if (self.currentDep) {
        self.watch(name, self.currentDep)
      }
      return value
    },

    set: function(newValue) {
      var oldValue = value

      value = newValue

      if (self.deps[name]) {
        for(var i = 0; i < self.deps[name].length; i++) {
          var callback = self.deps[name][i]
          callback.call(self.vue, value, oldValue)
        }
      }
    },
  })
}

/**
 * 初始化计算属性的订阅方法
 * @param {string} name - 属性名
 *
 */
TinyVueProxy.prototype.proxyComputed = function(name, computed) {
  var self = this

  Object.defineProperty(this.data, name, {
    get: function() {
      if (self.currentDep) {
        self.watch(name, self.currentDep)
      }
      return computed.call(self.vue)
    },
    writeable: false
  })
}


module.exports = TinyVueProxy

},{}]},{},[1])(1)
});