import hashlib
import base64
import os

def hash_password(password):
    # Generate a random salt
    salt = os.urandom(4)
    
    # Concatenate salt and password
    salted = salt + password.encode('utf-8')
    
    # Calculate SHA256
    hashed = hashlib.sha256(salted).digest()
    
    # Concatenate salt and hash
    salted_hash = salt + hashed
    
    # Base64 encode the result
    encoded = base64.b64encode(salted_hash).decode('utf-8')
    
    return encoded

if __name__ == "__main__":
    password = "dhruva123"
    hashed = hash_password(password)
    print(f"Password hash for '{password}': {hashed}") 