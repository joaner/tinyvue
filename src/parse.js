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

  // v-if里要替换的emptyNode
  var emptyNode = new Comment()

  // 每次属性变化，都要执行的订阅方法
  self.vue.proxy.currentDep = (function(emptyNode) {
    return function() {
      switch (directive) {
        case 'if':
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
          break
        case 'show':
          var result = self.execExpression(attribute.value)
          node.style.display = result ? null : 'none'
          break
        case 'click':
          node.addEventListener(directive, function() {
            self.execExpression(attribute.value)
          })
          break
      }
    }
  })(emptyNode);

  // 初始执行一次表达式，通过读取属性，来建立订阅关系
  // 参见 proxy.js 的 Object,defineProperty get方法
  self.vue.proxy.currentDep()

  // 关系建立完后重置
  self.vue.proxy.currentDep = null
}

module.exports = TinyVueParse
