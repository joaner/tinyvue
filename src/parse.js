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
