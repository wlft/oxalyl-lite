// wlft / 2024-11-13 / intended for Cloudflare Workers

const sys = {
    "v": "0.0.3",
    "build": "stable",
    "user_agent": "OxalylLite/0.0.3",
    "operating_from": "mydomain.com"
  }
  
  const auth_keys = [
   'key_here'
  ]
  
  const errors = {
    "no-auth": JSON.stringify({"code":401,"message":"Invalid or missing authentication","error":"401 Unauthorized"}),
    "proxy-404": JSON.stringify({"code":404,"message":"This page does not exist on the Oxalyl proxy","error":"404 Not Found"}),
    "unhandled-500": JSON.stringify({"code":500,"message":"Unhandled request","error":"500 Internal Server Error"}),
    "unsupported-service": JSON.stringify({"code":400,"message":"This service is not supported with Oxalyl","error":"400 Bad Request"}),
  }
  
  export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url)

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
        if (url.pathname === "/robots.txt") { return new Response("User-Agent: *\n\nDisallow: /",{status:200,headers:{"X-Robots-Tag":"no-index","X-Powered-By":"OxalylLite"}}); };
        if (url.pathname === "/wolfite-status-internal") { return new Response("200 OK",{status:200,headers:{"X-Robots-Tag":"no-index","X-Powered-By":"OxalylLite"}}); };

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
        if ((!req.headers.has('oxalyl-lite-auth') && !req.headers.has('oxalyl-lite-rotating-auth'))  || (!auth_keys.includes(req.headers.get('oxalyl-lite-auth')) && !auth_keys.includes(req.headers.get('oxalyl-lite-rotating-auth')))) {
            return new Response(errors["no-auth"],{status:401,headers:{"wlft-eri":"retry-auth","X-Robots-Tag":"no-index","X-Powered-By":"OxalylLite"}});
        }
  
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
        if (url.pathname === "/" || url.pathname === "/status" || !url.pathname) { return new Response("200 OK",{status:200,headers:{"wlft-eri":"retry-auth","X-Robots-Tag":"no-index","X-Powered-By":"OxalylLite"}}); };
        if (url.pathname === "/config" || url.pathname === "/info" || url.pathname === "/about" || url.pathname === "/v" || url.pathname === '/oxalyl') { return new Response(JSON.stringify({"v":`${sys.v} ${sys.build.toUpperCase()}`,"semver":sys.v,"build":sys.build}),{status:200,headers:{"wlft-eri":"retry-auth","X-Robots-Tag":"no-index","X-Powered-By":"OxalylLite"}}); };
  
        const segments = url.pathname.split('/').filter(Boolean)
  
        if (!(segments[0] === "roblox.com")) {
            // service not whitelisted
            return new Response(errors["unsupported-service"],{status:400,headers:{"wlft-eri":"do-not-retry"}});
        }

        let subdomain = segments[1]
        if (subdomain === "root") { subdomain = null; };
  
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
        let destination = `https://${subdomain || ""}${subdomain ? "." : ""}${segments[0]}/${segments.slice(2).join('/')}`
        let target_url = new URL(destination)
  
        target_url.search = url.search
        target_url.hash = url.hash
  
        let pheaders = new Headers()
  
        pheaders.append("User-Agent", sys.user_agent)
        pheaders.append("X-Forwarded-For", req.headers.get('CF-Connecting-IP'))
        pheaders.append("X-Powered-By", 'OxalylLite')
        pheaders.append("Via", `HTTP/1.1 ${sys.operating_from}`)
        pheaders.append('Content-Type', req.headers.get('Content-Type') || 'application/json')
        pheaders.append('Accept', '*/*')
  
        const preq = new Request(target_url, {
            method: req.method,
            headers: pheaders,
            body: req.method != "GET" ? req.body : null,
            redirect: "follow"
        })
  
        const res = await fetch(preq)
  
        if (res && res != null) {
            return res
        }
  
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        return new Response(errors["unhandled-500"],{status:500,headers:{"wlft-eri":"do-not-retry","X-Powered-By":"OxalylLite"}});
    }
  }
