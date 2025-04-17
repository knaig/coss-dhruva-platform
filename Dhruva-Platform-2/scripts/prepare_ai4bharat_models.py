import os
import shutil
from pathlib import Path
import json

def create_model_config(model_name, model_type, input_shapes, output_shapes, max_batch_size=32):
    """Create a model configuration file for Triton"""
    config = f"""
name: "{model_name}"
platform: "pytorch_libtorch"
max_batch_size: {max_batch_size}

input [
    {{
        name: "INPUT__0"
        data_type: TYPE_FP32
        dims: {input_shapes}
    }}
]

output [
    {{
        name: "OUTPUT__0"
        data_type: TYPE_FP32
        dims: {output_shapes}
    }}
]

instance_group [
    {{
        kind: KIND_GPU
        count: 1
    }}
]

dynamic_batching {{
    max_queue_delay_microseconds: 100
}}
"""
    return config

def prepare_model(model_name, model_path, model_type, input_shapes, output_shapes, max_batch_size=32):
    """Prepare a model for Triton deployment"""
    # Create model directory
    model_dir = Path(f"/models/{model_name}")
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Create version directory
    version_dir = model_dir / "1"
    version_dir.mkdir(exist_ok=True)
    
    # Copy model files
    if os.path.isdir(model_path):
        shutil.copytree(model_path, version_dir, dirs_exist_ok=True)
    else:
        shutil.copy2(model_path, version_dir)
    
    # Create config file
    config = create_model_config(model_name, model_type, input_shapes, output_shapes, max_batch_size)
    with open(model_dir / "config.pbtxt", "w") as f:
        f.write(config)
    
    print(f"Model {model_name} prepared successfully!")

def main():
    # Load model configurations from a JSON file
    config_file = "model_configs.json"
    if not os.path.exists(config_file):
        # Create default configurations if file doesn't exist
        models = [
            {
                "name": "translation",
                "path": "/path/to/translation/model",
                "type": "pytorch",
                "input_shapes": "[1, 512]",
                "output_shapes": "[1, 512]",
                "max_batch_size": 32
            },
            {
                "name": "asr",
                "path": "/path/to/asr/model",
                "type": "pytorch",
                "input_shapes": "[1, 16000]",
                "output_shapes": "[1, 100]",
                "max_batch_size": 16
            },
            {
                "name": "tts",
                "path": "/path/to/tts/model",
                "type": "pytorch",
                "input_shapes": "[1, 100]",
                "output_shapes": "[1, 22050]",
                "max_batch_size": 8
            }
        ]
        with open(config_file, "w") as f:
            json.dump(models, f, indent=4)
        print(f"Created default configuration file: {config_file}")
        print("Please update the model paths in the configuration file and run this script again.")
        return

    # Load and process configurations
    with open(config_file, "r") as f:
        models = json.load(f)

    for model in models:
        prepare_model(
            model["name"],
            model["path"],
            model["type"],
            model["input_shapes"],
            model["output_shapes"],
            model.get("max_batch_size", 32)
        )

if __name__ == "__main__":
    main() 