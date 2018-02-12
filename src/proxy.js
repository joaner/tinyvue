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

module.exports = TinyVueProxy
