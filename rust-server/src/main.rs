use std::env;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::Duration;

const DEFAULT_HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 38947;

fn main() {
    let (host, port) = parse_host_port();
    let bind_addr = format!("{host}:{port}");

    let listener = match TcpListener::bind(&bind_addr) {
        Ok(listener) => listener,
        Err(err) => {
            eprintln!("AMVerge CEP server bind error on {bind_addr}: {err}");
            std::process::exit(1);
        }
    };

    eprintln!("AMVerge CEP server listening on http://{bind_addr}");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                if let Err(err) = handle_client(stream) {
                    eprintln!("AMVerge CEP server request error: {err}");
                }
            }
            Err(err) => {
                eprintln!("AMVerge CEP server incoming connection error: {err}");
            }
        }
    }
}

fn parse_host_port() -> (String, u16) {
    let mut host = env::var("AMVERGE_CEP_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());
    let mut port = env::var("AMVERGE_CEP_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);

    let args: Vec<String> = env::args().collect();
    let mut i = 1;

    while i < args.len() {
        match args[i].as_str() {
            "--host" if i + 1 < args.len() => {
                host = args[i + 1].clone();
                i += 2;
            }
            "--port" if i + 1 < args.len() => {
                if let Ok(parsed) = args[i + 1].parse::<u16>() {
                    port = parsed;
                }
                i += 2;
            }
            _ => {
                i += 1;
            }
        }
    }

    (host, port)
}

fn handle_client(mut stream: TcpStream) -> Result<(), String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|e| e.to_string())?;

    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer).map_err(|e| e.to_string())?;
    if bytes_read == 0 {
        return Ok(());
    }

    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let (method, raw_path) = match parse_request_line(&request) {
        Some(parts) => parts,
        None => {
            write_plain(
                &mut stream,
                "400 Bad Request",
                "Malformed HTTP request",
            )?;
            return Ok(());
        }
    };

    let path = raw_path.split('?').next().unwrap_or(raw_path);

    match (method, path) {
        ("GET", "/health") => write_json(
            &mut stream,
            "200 OK",
            "{\"status\":\"ok\",\"service\":\"amverge_cep_server\"}",
        )?,
        ("GET", "/") => {
            let html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>AMVerge CEP Server</title></head><body><h1>AMVerge CEP server running</h1><p>Use <code>/health</code> for status.</p></body></html>";
            write_html(&mut stream, "200 OK", html)?;
        }
        ("OPTIONS", _) => write_empty(&mut stream, "204 No Content")?,
        _ => write_plain(&mut stream, "404 Not Found", "Not Found")?,
    }

    Ok(())
}

fn parse_request_line(request: &str) -> Option<(&str, &str)> {
    let first_line = request.lines().next()?;
    let mut parts = first_line.split_whitespace();
    let method = parts.next()?;
    let path = parts.next()?;
    Some((method, path))
}

fn write_empty(stream: &mut TcpStream, status: &str) -> Result<(), String> {
    write_response(stream, status, "text/plain; charset=utf-8", b"")
}

fn write_plain(stream: &mut TcpStream, status: &str, text: &str) -> Result<(), String> {
    write_response(stream, status, "text/plain; charset=utf-8", text.as_bytes())
}

fn write_json(stream: &mut TcpStream, status: &str, json: &str) -> Result<(), String> {
    write_response(stream, status, "application/json; charset=utf-8", json.as_bytes())
}

fn write_html(stream: &mut TcpStream, status: &str, html: &str) -> Result<(), String> {
    write_response(stream, status, "text/html; charset=utf-8", html.as_bytes())
}

fn write_response(
    stream: &mut TcpStream,
    status: &str,
    content_type: &str,
    body: &[u8],
) -> Result<(), String> {
    let headers = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET,OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n",
        body.len()
    );

    stream
        .write_all(headers.as_bytes())
        .map_err(|e| e.to_string())?;

    if !body.is_empty() {
        stream.write_all(body).map_err(|e| e.to_string())?;
    }

    stream.flush().map_err(|e| e.to_string())
}
