(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.TinyVue = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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

},{"./parse":2,"./proxy":3}],2:[function(require,module,exports){
/**
 * Parse template then bind data
 * @class
 * @param {TinyVue} vue - instance
 * @param {data} data
 */
var Parse = function(vue) {
  this.vue = vue
}

Parse.prototype.execute = function() {
  this.parseNode(this.vue.template)

  // reset render
  while (this.vue.el.firstChild) {
    this.vue.el.removeChild(this.vue.el.firstChild);
  }
  this.vue.el.appendChild(this.vue.template)
}

Parse.prototype.execExpression = function(expression) {
  var method = new Function('return ' + expression)
  return method.call(this.vue.data)
}

Parse.prototype.parseNode = function(node) {
  var self = this

  if (node.nodeType === Node.ELEMENT_NODE && node.hasAttributes()) {
    for (var i = 0; i < node.attributes.length; i++) {
      var attribute = node.attributes[i]
      if (attribute.name.indexOf('v-') === 0) {
        var directive = attribute.name.slice(2)

        var emptyNode = new Comment()
        self.vue.proxy.currentDep = (function(directive, attribute, emptyNode) {
          return function() {
            switch (directive) {
              case 'if':
                var result = self.execExpression(attribute.value)
                if (!result) {
                  node.parentNode.replaceChild(node, emptyNode)
                } else {
                  node.parentNode.replaceChild(emptyNode, node)
                }
                break
              case 'show':
                var result = self.execExpression(attribute.value)
                node.style.display = result ? 'block' : 'none'
                break
              case 'click':
                node.addEventListener(directive, function() {
                  self.execExpression(attribute.value)
                })
                break
            }
          }
        })(directive, attribute, emptyNode);

        self.vue.proxy.currentDep()

        self.vue.proxy.currentDep = null
      }
    }
  }

  if (node.hasChildNodes()) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var childNode = node.childNodes[i]

      if (childNode.nodeType === Node.ELEMENT_NODE) {
        if (childNode.nodeName === 'EXPRESSION') {
          self.vue.proxy.currentDep = (function(expression, childNode) {
            return function() {
              childNode.textContent = self.execExpression(expression)
            }
          })(childNode.textContent, childNode)

          self.vue.proxy.currentDep()
        } else {
          this.parseNode(childNode)
        }
      }
    }
  }
}

module.exports = Parse

},{}],3:[function(require,module,exports){
var Proxy = function(vue) {
  this.vue = vue
  this.data = vue.data

  this.deps = {}
  this.currentDep = null
}

Proxy.prototype.execute = function() {
  for (name in this.data) {
    this.proxy(name)
  }
}

Proxy.prototype.watch = function(name, callback) {
  if (!this.deps[name]) {
    this.deps[name] = []
  }
  this.deps[name].push(callback)
}

Proxy.prototype.proxy = function(name) {
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

module.exports = Proxy

},{}]},{},[1])(1)
});