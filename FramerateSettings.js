/*:
@plugindesc
Customize framerate with options.
Version 0.1
@author KoloMl
@target MZ

@help
FramerateSettings.js

Helper plugin for customizing framerate. Includes ability to add
framerate customization to Options menu.

@param options
@text Option Settings

@param enableFramerate
@text Enable Framerate Setting
@desc Add the option to change max framerate to the Options menu.
@type boolean
@default true
@parent options

@param enableFpsCounter
@text Enable FPS Counter Setting
@desc Add the option to toggle the framerate counter to Options menu.
@type boolean
@default false
@parent options

@param framerateOptions
@text Framerate Options
@desc Provide list of framerate values available in options. 0 fps means "unlimited" (display refresh rate).
@type number[]
@default [0,30,60,120,144,240,280]
@parent options

@param defaultFramerate
@text Default Framerate
@desc Select the default framerate set for the user. 0 fps means "unlimited" (display refresh rate).
@type number
@default 60
@min 0
@parent options

@param mz3dPatches
@text MZ3D Patches

@param mz3dForceSkyboxRerender
@text Patch Skybox Flickering
@desc This patch forces MZ3D to re-render everything again after skybox was rendered.
@type boolean
@default false

*/
(() => {
    const pluginSettings = PluginManager.parameters('FramerateSettings');

    const enableFramerateOption = pluginSettings["enableFramerate"]==='true';
    const enableFpsCounterOption = pluginSettings["enableFpsCounter"]==='true';
    const listOfFpsSettings = JSON.parse(pluginSettings["framerateOptions"]).map(Number);
    const defaultFramerate = Number(pluginSettings["defaultFramerate"]);
    const forceRenderAfterSkybox = pluginSettings["mz3dForceSkyboxRerender"]==='true';

    let currentFramerate = null;

    // Here we catch the moment when Graphics are ready an setting the default value.
    const _Graphics_initialize = Graphics.initialize;
    Graphics.initialize = function () {
        const isInitialized = _Graphics_initialize.call(Graphics);

        // Maybe you could load the saved "Max FPS" option here.
        Graphics.app.ticker.maxFPS = defaultFramerate;

        return isInitialized;
    }

    // MZ3D Patch: Fixes flickering when moving mouse around with frame limiter set too low.
    if (window.mz3d && forceRenderAfterSkybox) {
        const _mz3d_renderViews = mz3d.renderViews;

        mz3d.renderViews = function () {
            // First we check if at least some of the scenes needed rendering
            const someSceneNeededRenderingBeforeCall = mz3d.View.list.length && mz3d.View.list.some(view => view.needsRender)

            _mz3d_renderViews.apply(this, arguments);

            // And if someone needed it, we change the last render timestamp forcing MZ3D to not skip scene rendering.
            if (someSceneNeededRenderingBeforeCall) {
                this._lastRender--;
            }
        }
    }

    if (enableFpsCounterOption) {
        // This is a config value for switching different FPS counter modes.
        Object.defineProperty(ConfigManager, 'graphicsFpsCounter', {
            get() {
                return ''; // We do not show the current mode.
            },
            set() {
                // When trying to update the config value — just switch the FPS counter
                Graphics._fpsCounter.switchMode();
            },
            configurable: true,
            enumerable: false
        });
    }

    if (enableFramerateOption) {
        // This is a config value for current selected Max FPS value
        Object.defineProperty(ConfigManager, 'graphicsMaxFps', {
            get() {
                // Here we showing the actual maxFPS from engine.
                return currentFramerate;
            },
            set(v) {
                // Here we cycling through all available values.
                // First we check where our current FPS value is placed in the array.
                let fpsSettingIndex = listOfFpsSettings.findIndex(fpsValue => fpsValue===currentFramerate);

                // Failsafe, in case value is not in array
                if (fpsSettingIndex < 0) {
                    fpsSettingIndex = 0;
                }

                // Selecting next value, if last value reached — begin from the start.
                fpsSettingIndex = fpsSettingIndex + 1 % listOfFpsSettings.length;

                currentFramerate = listOfFpsSettings[fpsSettingIndex];
                Graphics.app.ticker.maxFPS = currentFramerate;
            },
            configurable: true,
            enumerable: false
        });

        // Saving the config values
        const _ConfigManager_makeData = ConfigManager.makeData;
        ConfigManager.makeData = function () {
            const config = _ConfigManager_makeData.apply(this, arguments);

            config.graphicsMaxFps = currentFramerate;

            return config;
        }

        // Loading settings from save data
        const _ConfigManager_applyData = ConfigManager.applyData;
        ConfigManager.applyData = function (config) {
            _ConfigManager_applyData.apply(this, arguments);

            currentFramerate = config.graphicsMaxFps;
            Graphics.app.ticker.maxFPS = currentFramerate;
        }
    }

    if (enableFramerateOption || enableFpsCounterOption) {
        const _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
        const _Window_Options_statusText = Window_Options.prototype.statusText;

        // Here we injection our own settings to the Options menu
        Window_Options.prototype.makeCommandList = function () {
            _Window_Options_makeCommandList.apply(this, arguments);

            // First argument — text of the setting, second argument — key of the config value.
            if (enableFramerateOption) {
                this.addCommand('Max FPS', 'graphicsMaxFps');
            }

            if (enableFpsCounterOption) {
                this.addCommand('Toggle FPS Counter', 'graphicsFpsCounter');
            }
        }

        // And here we show the values for these options
        Window_Options.prototype.statusText = function (index) {
            const symbol = this.commandSymbol(index);
            const value = this.getConfigValue(symbol);

            // Showing FPS value or "Unlimited" for "0"
            if (enableFramerateOption && symbol==='graphicsMaxFps') {
                return !value ? 'Unlimited':`${ value } FPS`;
            }

            // Showing nothing for FPS counter setting.
            if (enableFpsCounterOption && symbol==='graphicsFpsCounter') {
                return '';
            }

            // If we received call for other setting — then call the original function
            return _Window_Options_statusText.apply(this, arguments);
        }
    }
})();
