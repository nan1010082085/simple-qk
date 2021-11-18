'use strict';

var vue = require('vue');

/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */
var index = vue.defineComponent({
  name: 'Container',

  setup() {
    const h = this.$createElement;
    return () => {
      return h("route-view");
    };
  }

});

exports["default"] = index;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtMmZhOTVjZTEuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZW1wbGF0ZS9Db250YWluZXIvaW5kZXgudHN4Il0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBAYXV0aG9yOiBZYW5nIERvbmduYW5cclxuICogMjAyMeW5tDEx5pyIMTfml6VcclxuICovXHJcblxyXG5pbXBvcnQgeyBkZWZpbmVDb21wb25lbnQgfSBmcm9tICd2dWUnO1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb21wb25lbnQoe1xyXG4gIG5hbWU6ICdDb250YWluZXInLFxyXG4gIHNldHVwKCkge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgcmV0dXJuIDxyb3V0ZS12aWV3IC8+O1xyXG4gICAgfTtcclxuICB9XHJcbn0pO1xyXG4iXSwibmFtZXMiOlsiZGVmaW5lQ29tcG9uZW50IiwibmFtZSIsInNldHVwIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFHQSxZQUFlQSxtQkFBZSxDQUFDO0FBQzdCQyxFQUFBQSxJQUFJLEVBQUUsV0FEdUI7O0FBRTdCQyxFQUFBQSxLQUFLLEdBQUc7QUFBQTtBQUNOLFdBQU8sTUFBTTtBQUNYO0FBQ0QsS0FGRDtBQUdEOztBQU40QixDQUFELENBQTlCOzs7OyJ9
