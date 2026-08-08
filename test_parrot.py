from backend.src.orchestrator.router import _is_parrot_image_request

def test_parrot():
    q1 = "сгенерируй изображения попугая пожалуйста"
    q2 = "сгенерируй изображение попугая"
    q3 = "нарисуй котика"
    q4 = "попугай танцует"
    
    assert _is_parrot_image_request(q1) == True
    assert _is_parrot_image_request(q2) == True
    assert _is_parrot_image_request(q3) == False
    assert _is_parrot_image_request(q4) == False
    print("All parrot tests passed successfully!")

if __name__ == "__main__":
    test_parrot()
