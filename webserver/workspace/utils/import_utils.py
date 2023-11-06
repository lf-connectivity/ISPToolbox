# (c) Meta Platforms, Inc. and affiliates. Copyright
import sys
import inspect


def get_imported_classnames(module_name):
    """
    Gets the names of all classes imported in a module.

    To get all imported classes in the current module, do:
    ```
    from workspace.utils.import_utils import get_imported_classnames
    get_imported_classnames(__name__)
    ```
    This is written to replace the `__all__ = [# stuff]` __init__.py
    files we have lying around.
    """
    module = sys.modules[module_name]

    # ignore classes from the module
    return [cls[0] for cls in inspect.getmembers(module, inspect.isclass) if cls[1].__module__ != module_name]
