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
  this.parseNode(this.vue.template)

  // reset render
  while (this.vue.el.firstChild) {
    this.vue.el.removeChild(this.vue.el.firstChild);
  }
  this.vue.el.appendChild(this.vue.template)
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
 */
TinyVueParse.prototype.parseNode = function(node) {
  var self = this

  // 解析属性表达式
  if (node.nodeType === Node.ELEMENT_NODE && node.hasAttributes()) {
    for (var i = 0; i < node.attributes.length; i++) {
      var attribute = node.attributes[i]
      // 只处理 v-* 开头的属性
      if (attribute.name.indexOf('v-') !== 0) {
        continue
      }

      // 指令名
      var directive = attribute.name.slice(2)

      // v-if里要替换的emptyNode
      var emptyNode = new Comment()

      // 每次属性变化，都要执行的订阅方法
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

      // 初始执行一次表达式，通过读取属性，来建立订阅关系
      // 参见 proxy.js 的 Object,defineProperty get方法
      self.vue.proxy.currentDep()

      // 关系建立完后重置
      self.vue.proxy.currentDep = null
    }
  }

  if (node.hasChildNodes()) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var childNode = node.childNodes[i]

      // 如果是标签节点
      if (childNode.nodeType === Node.ELEMENT_NODE) {
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
          this.parseNode(childNode)
        }
      }
    }
  }
}

module.exports = TinyVueParse
