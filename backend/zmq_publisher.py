import zmq

def zmq_publisher_setup():
    """
    Sets up a ZeroMQ publisher for emitting control data.
    """
    context = zmq.Context()
    socket = context.socket(zmq.PUB)
    socket.bind("tcp://*:5555")  # Bind to port 5555
    return socket

# Create a single instance of the ZeroMQ publisher
zmq_socket = zmq_publisher_setup()
