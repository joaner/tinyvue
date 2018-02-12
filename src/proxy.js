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
