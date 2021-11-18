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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtYjllYmNlNWQuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZW1wbGF0ZS9Db250YWluZXIvaW5kZXgudHN4Il0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGF1dGhvcjogWWFuZyBEb25nbmFuXG4gKiAyMDIx5bm0MTHmnIgxN+aXpVxuICovXG5cbmltcG9ydCB7IGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb21wb25lbnQoe1xuICBuYW1lOiAnQ29udGFpbmVyJyxcbiAgc2V0dXAoKSB7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJldHVybiA8cm91dGUtdmlldyAvPjtcbiAgICB9O1xuICB9XG59KTtcbiJdLCJuYW1lcyI6WyJkZWZpbmVDb21wb25lbnQiLCJuYW1lIiwic2V0dXAiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUdBLFlBQWVBLG1CQUFlLENBQUM7QUFDN0JDLEVBQUFBLElBQUksRUFBRSxXQUR1Qjs7QUFFN0JDLEVBQUFBLEtBQUssR0FBRztBQUFBO0FBQ04sV0FBTyxNQUFNO0FBQ1g7QUFDRCxLQUZEO0FBR0Q7O0FBTjRCLENBQUQsQ0FBOUI7Ozs7In0=
