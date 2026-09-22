declare var mz3d: MZ3D.GlobalInstance;

declare namespace MZ3D {
    interface GlobalInstance {
        _lastRender: number;
        View: ViewModel;

        renderViews(): void;
    }

    interface ViewModel {
        list: ViewInstance[];
    }

    interface ViewInstance {
        needsRender: boolean;
    }
}