/**
 * Parse template then bind data
 * @class
 * @param {TinyVue} vue - instance
 * @param {data} data
 */
var Parse = function(vue) {
  this.vue = vue

  this.deps = {}
  this.currentDep = null
}

Parse.prototype.execute = function() {
  this.proxyData()

  this.parseNode(this.vue.template)

  while (this.vue.el.firstChild) {
    this.vue.el.removeChild(this.vue.el.firstChild);
  }
  this.vue.el.appendChild(this.vue.template)
}

Parse.prototype.execExpression = function(expression) {
  var method = new Function('return ' + expression)
  return method.call(this.vue.data)
}

Parse.prototype.proxyData = function() {
  var self = this

  for (name in this.vue.data) {
    this.proxy(this.vue.data, name)
  }
}

Parse.prototype.proxy = function(data, name) {
  var self = this
  var value = data[name]

  Object.defineProperty(data, name, {
    get: function() {
      if (self.currentDep) {
        if (!self.deps[name]) {
          self.deps[name] = []
        }
        self.deps[name].push(self.currentDep)
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

Parse.prototype.parseNode = function(node) {
  var self = this

  if (node.nodeType === Node.ELEMENT_NODE && node.hasAttributes()) {
    for (var i = 0; i < node.attributes.length; i++) {
      var attribute = node.attributes[i]
      if (attribute.name.indexOf('v-') === 0) {
        var directive = attribute.name.slice(2)

        var emptyNode = new Comment()
        this.currentDep = (function(directive, attribute, emptyNode) {
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

        this.currentDep()

        self.currentDep = null
      }
    }
  }

  if (node.hasChildNodes()) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var childNode = node.childNodes[i]

      if (childNode.nodeType === Node.ELEMENT_NODE) {
        if (childNode.nodeName === 'EXPRESSION') {
          this.currentDep = (function(expression, childNode) {
            return function() {
              childNode.textContent = self.execExpression(expression)
            }
          })(childNode.textContent, childNode)

          this.currentDep()
        } else {
          this.parseNode(childNode)
        }
      }
    }
  }
}

module.exports = Parse
