/**
 * React Flip Move | propConverter
 * (c) 2016-present Joshua Comeau
 *
 * Abstracted away a bunch of the messy business with props.
 *   - propTypes and defaultProps
 *   - Type conversion (We accept 'string' and 'number' values for duration,
 *     delay, and other fields, but we actually need them to be ints.)
 *   - Children conversion (we need the children to be an array. May not always
 *     be, if a single child is passed in.)
 *   - Resolving animation presets into their base CSS styles
 */

import React, { Component, PropTypes } from 'react';

import {
  statelessFunctionalComponentSupplied,
  invalidTypeForTimingProp,
  invalidEnterLeavePreset,
  deprecatedDisableAnimations,
} from './error-messages';
import {
  enterPresets, leavePresets, defaultPreset, disablePreset,
} from './enter-leave-presets';
import { isElementAnSFC, omit } from './helpers';


function propConverter(ComposedComponent) {
  class FlipMovePropConverter extends Component {
    convertProps(props) {
      const { propTypes, defaultProps } = FlipMovePropConverter;

      // Create a non-immutable working copy
      let workingProps = { ...props };

      // Convert `children` to an array. This is to standardize when a single
      // child is passed, as well as if the child is falsy.
      workingProps.children = React.Children.toArray(props.children);

      // FlipMove does not support stateless functional components.
      // Check to see if any supplied components won't work.
      // If the child doesn't have a key, it means we aren't animating it.
      // It's allowed to be an SFC, since we ignore it.
      const noStateless = workingProps.children.every(child =>
         !isElementAnSFC(child) || typeof child.key === 'undefined'
      );

      if (!noStateless) {
        console.warn(statelessFunctionalComponentSupplied());
      }

      // Do string-to-int conversion for all timing-related props
      const timingPropNames = [
        'duration', 'delay', 'staggerDurationBy', 'staggerDelayBy',
      ];

      timingPropNames.forEach((prop) => {
        const rawValue = workingProps[prop];
        let value = typeof rawValue === 'string'
          ? parseInt(rawValue, 10)
          : rawValue;

        if (isNaN(value)) {
          const defaultValue = defaultProps[prop];
          const errorMessage = invalidTypeForTimingProp({
            prop,
            value,
            defaultValue,
          });
          console.error(errorMessage);

          value = defaultValue;
        }

        workingProps[prop] = value;
      });

      // Our enter/leave animations can be specified as boolean (default or
      // disabled), string (preset name), or object (actual animation values).
      // Let's standardize this so that they're always objects
      workingProps.enterClassName = this.convertAnimationProp(workingProps.enterClassName);
      workingProps.leaveClassName = this.convertAnimationProp(workingProps.leaveClassName);

      // Accept `disableAnimations`, but add a deprecation warning
      if (typeof props.disableAnimations !== 'undefined') {
        console.warn(deprecatedDisableAnimations());
        workingProps.disableAnimations = undefined;
        workingProps.disableAllAnimations = props.disableAnimations;
      }

      // Gather any additional props;
      // they will be delegated to the ReactElement created.
      const primaryPropKeys = Object.keys(propTypes);
      const delegatedProps = omit(this.props, primaryPropKeys);

      // The FlipMove container element needs to have a non-static position.
      // We use `relative` by default, but it can be overridden by the user.
      // Now that we're delegating props, we need to merge this in.
      delegatedProps.style = {
        position: 'relative',
        ...delegatedProps.style,
      };

      workingProps = omit(workingProps, Object.keys(delegatedProps));
      workingProps.delegated = delegatedProps;

      return workingProps;
    }

    // eslint-disable-next-line class-methods-use-this
    convertAnimationProp(animation) {
      return typeof animation === 'function' ? animation : () => animation;
    }


    render() {
      return (
        <ComposedComponent {...this.convertProps(this.props)} />
      );
    }
  }

  FlipMovePropConverter.propTypes = {
    children: PropTypes.node,
    easing: PropTypes.string,
    duration: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    delay: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    staggerDurationBy: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    staggerDelayBy: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    onStart: PropTypes.func,
    onFinish: PropTypes.func,
    onStartAll: PropTypes.func,
    onFinishAll: PropTypes.func,
    typeName: PropTypes.string,
    enterClassName: PropTypes.oneOfType([
      PropTypes.shape({
        from: PropTypes.string,
        to: PropTypes.string,
      }),
      PropTypes.func,
    ]),
    leaveClassName: PropTypes.oneOfType([
      PropTypes.shape({
        from: PropTypes.string,
        to: PropTypes.string,
      }),
      PropTypes.func,
    ]),
    disableAllAnimations: PropTypes.bool,
    getPosition: PropTypes.func,
    maintainContainerHeight: PropTypes.bool.isRequired,
  };

  FlipMovePropConverter.defaultProps = {
    easing: 'ease-in-out',
    duration: 350,
    delay: 0,
    staggerDurationBy: 0,
    staggerDelayBy: 0,
    typeName: 'div',
    enterClassName: defaultPreset,
    leaveClassName: defaultPreset,
    disableAllAnimations: false,
    getPosition: node => node.getBoundingClientRect(),
    maintainContainerHeight: false,
  };

  return FlipMovePropConverter;
}

export default propConverter;
