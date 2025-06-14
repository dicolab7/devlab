// src/front/js/post.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Iniciando post.js - Timestamp:", new Date().toISOString());

  try {
    const authRaw = localStorage.getItem("auth");
    console.log("authRaw:", authRaw);
    let auth;
    try {
      auth = JSON.parse(authRaw);
      console.log("Auth parsed:", auth);
    } catch (parseError) {
      console.error("Erro ao parsear auth:", parseError.message);
      throw new Error(`Falha ao parsear auth: ${parseError.message}`);
    }

    if (!auth || !auth.token) {
      console.warn("Token de autenticação não encontrado. Redirecionando...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      localStorage.removeItem("auth");
      window.location.href = "/login.html";
      return;
    }

    let userData;
    try {
      console.log("Enviando requisição para GET /api/users");
      const userResponse = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      console.log("Status da resposta:", userResponse.status, userResponse.statusText);
      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        console.error("Detalhes do erro:", errorData);
        throw new Error(`Erro na requisição: ${userResponse.status} - ${errorData.message || 'Sem mensagem'}`);
      }
      const user = await userResponse.json();
      console.log("Usuário recebido:", user);
      userData = {
        nome: user.user.nome_usr || "Usuário",
        avatar: user.user.img_usr || "/Uploads/avatar-padrao.png",
        email: user.user.email_usr || "Sem email",
      };
    } catch (err) {
      console.error("Erro ao buscar dados do usuário:", err.message);
      localStorage.removeItem("auth");
      window.location.href = "/login.html";
      return;
    }

    const profileCard = document.getElementById("profile-info");
    if (profileCard) {
      let nome = userData.nome.split(" ")[0];
      nome = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
      if (nome.length > 8) nome = nome.slice(0, 8) + "...";
      profileCard.innerHTML = `
        <img src="${userData.avatar}" alt="Usuário" class="avatar-sm" />
        <h3>${nome}</h3>
        <p>${userData.email}</p>
      `;
    } else {
      console.warn("Elemento #profile-info não encontrado.");
    }

    const topicoId = sessionStorage.getItem("currentTopicoId");
    console.log("Tópico ID recuperado do sessionStorage:", topicoId);
    const questionArea = document.querySelector(".question-area");
    if (!topicoId) {
      console.warn("Tópico ID não encontrado no sessionStorage.");
      if (questionArea) {
        questionArea.innerHTML = "<p>Tópico não encontrado.</p>";
      }
      return;
    }

    async function carregarTopico() {
      if (!questionArea) {
        console.warn("Elemento .question-area não encontrado.");
        return;
      }
      try {
        console.log("Carregando tópico ID:", topicoId);
        const response = await fetch(`/api/forum/topicos/${topicoId}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        console.log("Status da resposta:", response.status, response.statusText);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Detalhes do erro:", errorData);
          throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
        }
        const topico = await response.json();
        console.log("Tópico recebido:", topico);

        const topicCard = document.getElementById("topic-card");
        if (topicCard) {
          topicCard.innerHTML = `
            <header class="topic-header">
              <img src="${topico.user.avatar || "/Uploads/avatar-padrao.png"}" alt="Usuário" class="avatar-sm" />
              <div>
                <strong>${topico.user.nome}</strong><br />
                <small>${new Date(topico.time).toLocaleString()}</small>
              </div>
            </header>
            <h2>${topico.titulo}</h2>
            <div>${topico.descricao}</div>
            <div class="tags">
              ${topico.tags.map((tag) => `<span>${tag}</span>`).join("")}
            </div>
            <div class="actions">
              <button class="like-btn ${topico.liked ? "liked" : ""}" data-topico-id="${topico.id}">
                👍 ${topico.likes || 0}
              </button>
            </div>
          `;
          // Vincular evento de like
          const likeButton = topicCard.querySelector(".like-btn");
          if (likeButton) {
            likeButton.addEventListener("click", () => likeTopico(topico.id));
          }
        }

        const ratingAverage = document.getElementById("rating-average");
        const ratingCount = document.getElementById("rating-count");
        if (ratingAverage && ratingCount) {
          ratingAverage.textContent = (topico.rating || 0).toFixed(1);
          ratingCount.textContent = topico.rating_count || 0;
        }

        const stars = document.querySelectorAll(".stars .fa-star");
        if (stars.length) {
          stars.forEach((star) => {
            star.classList.remove("filled");
            if (topico.user_rating && star.dataset.rating <= topico.user_rating) {
              star.classList.add("filled");
            }
            star.addEventListener("click", () => avaliarTopico(topico.id, star.dataset.rating));
          });
        } else {
          console.warn("Elementos .stars .fa-star não encontrados.");
        }

        const answersSection = document.getElementById("answers");
        if (answersSection) {
          answersSection.innerHTML = topico.respostas
            .map(
              (resposta) => `
                <article class="answer-card">
                  <header>
                    <img src="${resposta.user_avatar || "/Uploads/avatar-padrao.png"}" alt="Usuário" class="avatar-sm" />
                    <div>
                      <strong>${resposta.user_nome}</strong>
                      <small>${new Date(resposta.created_at).toLocaleString()}</small>
                    </div>
                  </header>
                  <p>${resposta.conteudo}</p>
                  <div class="actions">
                    <button class="like-btn ${resposta.liked ? "liked" : ""}" data-resposta-id="${resposta.id}">
                      👍 ${resposta.likes || 0}
                    </button>
                    <a href="#" class="reply-link" data-resposta-id="${resposta.id}">Responder</a>
                  </div>
                  <div id="replies-${resposta.id}">
                    ${resposta.replies
                      .map(
                        (reply) => `
                          <div class="reply">
                            <strong>${reply.user_nome}</strong>: ${reply.conteudo}
                            <small>${new Date(reply.created_at).toLocaleString()}</small>
                          </div>
                        `
                      )
                      .join("")}
                    <form class="reply-form" id="reply-form-${resposta.id}" style="display: none;">
                      <textarea placeholder="Digite sua resposta aqui" required></textarea>
                      <div class="actions">
                        <button type="button" class="cancel">Cancelar</button>
                        <button type="submit" class="submit">Enviar</button>
                      </div>
                    </form>
                  </div>
                </article>
              `
            )
            .join("");

          // Vincular eventos de like e reply
          answersSection.querySelectorAll(".like-btn").forEach((button) => {
            button.addEventListener("click", () => likeResposta(button.dataset.respostaId));
          });
          answersSection.querySelectorAll(".reply-link").forEach((link) => {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              showReplyForm(link.dataset.respostaId);
            });
          });
          answersSection.querySelectorAll(".reply-form").forEach((form) => {
            form.addEventListener("submit", async (e) => {
              e.preventDefault();
              const respostaId = form.id.replace("reply-form-", "");
              const conteudo = form.querySelector("textarea").value;
              try {
                console.log("Enviando requisição para POST /api/forum/replies");
                const response = await fetch("/api/forum/replies", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth.token}`,
                  },
                  body: JSON.stringify({ resposta_id: respostaId, conteudo }),
                });
                console.log("Status da resposta:", response.status, response.statusText);
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  console.error("Detalhes do erro:", errorData);
                  throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
                }
                form.reset();
                hideReplyForm(respostaId);
                carregarTopico();
              } catch (error) {
                console.error("Erro ao postar reply:", error.message);
                alert("Erro ao postar reply: " + error.message);
              }
            });
            const cancelButton = form.querySelector(".cancel");
            if (cancelButton) {
              cancelButton.addEventListener("click", () => hideReplyForm(form.id.replace("reply-form-", "")));
            }
          });
        } else {
          console.warn("Elemento #answers não encontrado.");
        }

        const commentForm = document.getElementById("comment-form");
        if (commentForm) {
          commentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const conteudo = commentForm.querySelector("textarea").value;
            try {
              console.log("Enviando requisição para POST /api/forum/respostas");
              const response = await fetch("/api/forum/respostas", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${auth.token}`,
                },
                body: JSON.stringify({ topico_id: topicoId, conteudo }),
              });
              console.log("Status da resposta:", response.status, response.statusText);
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Detalhes do erro:", errorData);
                throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
              }
              commentForm.reset();
              carregarTopico();
            } catch (error) {
              console.error("Erro ao postar comentário:", error.message);
              alert("Erro ao postar comentário: " + error.message);
            }
          });
          const cancelButton = commentForm.querySelector(".cancel");
          if (cancelButton) {
            cancelButton.addEventListener("click", () => commentForm.reset());
          }
        } else {
          console.warn("Elemento #comment-form não encontrado.");
        }
      } catch (error) {
        console.error("Erro ao carregar tópico:", error.message);
        questionArea.innerHTML = `<p>Erro ao carregar tópico: ${error.message}</p>`;
      }
    }

    async function likeTopico(topicoId) {
      try {
        console.log("Enviando requisição para POST /api/forum/topicos/:id/like");
        const response = await fetch(`/api/forum/topicos/${topicoId}/like`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        console.log("Status da resposta:", response.status, response.statusText);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Detalhes do erro:", errorData);
          throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
        }
        carregarTopico();
      } catch (error) {
        console.error("Erro ao curtir tópico:", error.message);
        alert("Erro ao curtir tópico: " + error.message);
      }
    }

    async function likeResposta(respostaId) {
      try {
        console.log("Enviando requisição para POST /api/forum/respostas/:id/like");
        const response = await fetch(`/api/forum/respostas/${respostaId}/like`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        console.log("Status da resposta:", response.status, response.statusText);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Detalhes do erro:", errorData);
          throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
        }
        carregarTopico();
      } catch (error) {
        console.error("Erro ao curtir resposta:", error.message);
        alert("Erro ao curtir resposta: " + error.message);
      }
    }

    async function avaliarTopico(topicoId, rating) {
      try {
        console.log("Enviando requisição para POST /api/forum/topicos/:id/avaliar", { topicoId, rating });
        const response = await fetch(`/api/forum/topicos/${topicoId}/avaliar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ rating: parseInt(rating) }),
        });
        console.log("Status da resposta:", response.status, response.statusText);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Detalhes do erro:", errorData);
          throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
        }
        carregarTopico();
      } catch (error) {
        console.error("Erro ao avaliar tópico:", error.message);
        alert("Erro ao avaliar tópico: " + error.message);
      }
    }

    function showReplyForm(respostaId) {
      const form = document.getElementById(`reply-form-${respostaId}`);
      if (form) {
        form.style.display = "block";
      } else {
        console.warn(`Formulário #reply-form-${respostaId} não encontrado.`);
      }
    }

    function hideReplyForm(respostaId) {
      const form = document.getElementById(`reply-form-${respostaId}`);
      if (form) {
        form.style.display = "none";
      } else {
        console.warn(`Formulário #reply-form-${respostaId} não encontrado.`);
      }
    }

    carregarTopico();
  } catch (err) {
    console.error("Erro crítico em post.js:", err.message);
    await new Promise(resolve => setTimeout(resolve, 2000));
    localStorage.removeItem("auth");
    window.location.href = "/login.html";
  }
});

// // front/js/post.js//
// document.addEventListener("DOMContentLoaded", async () => {
//   console.log("Iniciando post.js - Timestamp:", new Date().toISOString());
//   try {
//     console.log("Verificando localStorage.auth...");
//     const authRaw = localStorage.getItem("auth");
//     console.log("authRaw:", authRaw);
//     let auth;
//     try {
//       auth = JSON.parse(authRaw);
//       console.log("Auth parsed:", auth);
//     } catch (parseError) {
//       console.error("Erro ao parsear auth:", parseError.message);
//       throw new Error(`Falha ao parsear auth: ${parseError.message}`);
//     }

//     if (!auth || !auth.token) {
//       console.warn("Token de autenticação não encontrado. Redirecionando em 2 segundos...");
//       await new Promise(resolve => setTimeout(resolve, 2000)); // Atraso para ver logs
//       localStorage.removeItem("auth");
//       window.location.href = "login.html";
//       return;
//     }

//     let userData;
//     // Buscar dados do usuário via API
//     try {
//       console.log("Enviando requisição para GET /api/users com token:", auth.token);
//       const userResponse = await fetch('http://127.0.0.1:3000/api/users', {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       console.log("Status da resposta:", userResponse.status, userResponse.statusText);
//       if (!userResponse.ok) {
//         let errorData;
//         try {
//           errorData = await userResponse.json();
//         } catch (e) {
//           errorData = { message: "Sem mensagem de erro retornada" };
//         }
//         console.log("Detalhes do erro:", errorData);
//         throw new Error(`Erro na requisição: ${userResponse.status} ${userResponse.statusText} - ${errorData.message || 'Sem mensagem'}`);
//       }
//       const user = await userResponse.json();
//       console.log("Usuário recebido:", user);
//       userData = {
//         nome: user.user.nome_usr || "Usuário",
//         avatar: user.user.img_usr || "https://i.pravatar.cc/40",
//         email: user.user.email_usr || "Sem email",
//       };
//     } catch (err) {
//       console.error("Erro ao buscar dados do usuário via API:", err.message);
//       localStorage.removeItem("auth");
//       window.location.href = "login.html";
//       return;
//     }

//     const profileCard = document.getElementById("profile-info");
//     if (profileCard) {
//       let nome = userData.nome.split(" ")[0];
//       nome = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
//       if (nome.length > 8) nome = nome.slice(0, 8) + "...";
//       profileCard.innerHTML = `
//         <img src="${userData.avatar}" alt="Usuário" class="avatar-sm" />
//         <h3>${nome}</h3>
//         <p>${userData.email}</p>
//       `;
//     } else {
//       console.warn("Elemento #profile-info não encontrado.");
//     }

//     const topicoId = sessionStorage.getItem("currentTopicoId");
//     console.log("Tópico ID recuperado do sessionStorage:", topicoId);
//     if (!topicoId) {
//       console.warn("Tópico ID não encontrado no sessionStorage.");
//       document.querySelector(".question-area").innerHTML = "<p>Tópico não encontrado.</p>";
//       return;
//     }

//     async function carregarTopico() {
//       try {
//         console.log("Carregando tópico ID:", topicoId);
//         const response = await fetch(`http://127.0.0.1:3000/api/topicos/${topicoId}`, {
//           headers: {
//             Authorization: `Bearer ${auth.token}`,
//           },
//         });
//         console.log("Status da resposta:", response.status, response.statusText);
//         if (!response.ok) {
//           let errorData;
//           try {
//             errorData = await response.json();
//           } catch (e) {
//             errorData = { error: "Sem mensagem de erro retornada" };
//           }
//           console.log("Detalhes do erro:", errorData);
//           throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
//         }
//         const topico = await response.json();
//         console.log("Tópico recebido:", topico);

//         const topicCard = document.getElementById("topic-card");
//         if (topicCard) {
//           topicCard.innerHTML = `
//             <header class="topic-header">
//               <img src="${topico.user.avatar || "https://i.pravatar.cc/40"}" alt="Usuário" class="avatar-sm" />
//               <div>
//                 <strong>${topico.user.nome}</strong><br />
//                 <small>${new Date(topico.time).toLocaleString()}</small>
//               </div>
//             </header>
//             <h2>${topico.titulo}</h2>
//             <div>${topico.descricao}</div>
//             <div class="tags">
//               ${topico.tags.map((tag) => `<span>${tag}</span>`).join("")}
//             </div>
//             <div class="actions">
//               <button class="like-btn ${topico.liked ? "liked" : ""}" onclick="likeTopico(${topico.id})">
//                 👍 ${topico.likes || 0}
//               </button>
//             </div>
//           `;
//         }

//         const ratingAverage = document.getElementById("rating-average");
//         const ratingCount = document.getElementById("rating-count");
//         if (ratingAverage && ratingCount) {
//           ratingAverage.textContent = (topico.rating || 0).toFixed(1);
//           ratingCount.textContent = topico.rating_count || 0;
//         }
//         const stars = document.querySelectorAll(".stars .fa-star");
//         stars.forEach((star) => {
//           star.classList.remove("filled");
//           star.addEventListener("click", () => avaliarTopico(topico.id, star.dataset.rating));
//           if (topico.user_rating && star.dataset.rating <= topico.user_rating) {
//             star.classList.add("filled");
//           }
//         });

//         const answersSection = document.getElementById("answers");
//         if (answersSection) {
//           answersSection.innerHTML = topico.respostas
//             .map(
//               (resposta) => `
//                 <article class="answer-card">
//                   <header>
//                     <img src="${resposta.user_avatar || "https://i.pravatar.cc/40"}" alt="Usuário" class="avatar-sm" />
//                     <div>
//                       <strong>${resposta.user_nome}</strong>
//                       <small>${new Date(resposta.created_at).toLocaleString()}</small>
//                     </div>
//                   </header>
//                   <p>${resposta.conteudo}</p>
//                   <div class="actions">
//                     <button class="like-btn ${resposta.liked ? "liked" : ""}" onclick="likeResposta(${resposta.id})">
//                       👍 ${resposta.likes || 0}
//                     </button>
//                     <a href="#" onclick="showReplyForm(${resposta.id}); return false;">Responder</a>
//                   </div>
//                   <div id="replies-${resposta.id}">
//                     ${resposta.replies
//                       .map(
//                         (reply) => `
//                           <div class="reply">
//                             <strong>${reply.user_nome}</strong>: ${reply.conteudo}
//                             <small>${new Date(reply.created_at).toLocaleString()}</small>
//                           </div>
//                         `
//                       )
//                       .join("")}
//                     <form class="reply-form" id="reply-form-${resposta.id}" style="display: none;">
//                       <textarea placeholder="Digite sua resposta aqui" required></textarea>
//                       <div class="actions">
//                         <button type="button" class="cancel" onclick="hideReplyForm(${resposta.id})">Cancelar</button>
//                         <button type="submit" class="submit">Enviar</button>
//                       </div>
//                     </form>
//                   </div>
//                 </article>
//               `
//             )
//             .join("");
//         }

//         const commentForm = document.getElementById("comment-form");
//         if (commentForm) {
//           commentForm.addEventListener("submit", async (e) => {
//             e.preventDefault();
//             const conteudo = commentForm.querySelector("textarea").value;
//             try {
//               console.log("Enviando requisição para POST /api/respostas");
//               const response = await fetch("http://127.0.0.1:3000/api/respostas", {
//                 method: "POST",
//                 headers: {
//                   "Content-Type": "application/json",
//                   Authorization: `Bearer ${auth.token}`,
//                 },
//                 body: JSON.stringify({ topico_id: topicoId, conteudo }),
//               });
//               console.log("Status da resposta:", response.status, response.statusText);
//               if (!response.ok) {
//                 let errorData;
//                 try {
//                   errorData = await response.json();
//                 } catch (e) {
//                   errorData = { error: "Sem mensagem de erro retornada" };
//                 }
//                 console.log("Detalhes do erro:", errorData);
//                 throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
//               }
//               commentForm.reset();
//               carregarTopico();
//             } catch (error) {
//               console.error("Erro ao postar comentário:", error);
//               alert("Erro ao postar comentário: " + error.message);
//             }
//           });
//         }

//         document.querySelectorAll(".reply-form").forEach((form) => {
//           form.addEventListener("submit", async (e) => {
//             e.preventDefault();
//             const respostaId = form.id.replace("reply-form-", "");
//             const conteudo = form.querySelector("textarea").value;
//             try {
//               console.log("Enviando requisição para POST /api/replies");
//               const response = await fetch("http://127.0.0.1:3000/api/replies", {
//                 method: "POST",
//                 headers: {
//                   "Content-Type": "application/json",
//                   Authorization: `Bearer ${auth.token}`,
//                 },
//                 body: JSON.stringify({ resposta_id: respostaId, conteudo }),
//               });
//               console.log("Status da resposta:", response.status, response.statusText);
//               if (!response.ok) {
//                 let errorData;
//                 try {
//                   errorData = await response.json();
//                 } catch (e) {
//                   errorData = { error: "Sem mensagem de erro retornada" };
//                 }
//                 console.log("Detalhes do erro:", errorData);
//                 throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
//               }
//               form.reset();
//               hideReplyForm(respostaId);
//               carregarTopico();
//             } catch (error) {
//               console.error("Erro ao postar reply:", error);
//               alert("Erro ao postar reply: " + error.message);
//             }
//           });
//         });
//       } catch (error) {
//         console.error("Erro ao carregar tópico:", error);
//         document.querySelector(".question-area").innerHTML = `<p>Erro ao carregar tópico: ${error.message}</p>`;
//       }
//     }

//     async function likeTopico(topicoId) {
//       try {
//         console.log("Enviando requisição para POST /api/topicos/:id/like");
//         const response = await fetch(`http://127.0.0.1:3000/api/topicos/${topicoId}/like`, {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${auth.token}`,
//           },
//         });
//         console.log("Status da resposta:", response.status, response.statusText);
//         if (!response.ok) {
//           let errorData;
//           try {
//             errorData = await response.json();
//           } catch (e) {
//             errorData = { error: "Sem mensagem de erro retornada" };
//           }
//           console.log("Detalhes do erro:", errorData);
//           throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
//         }
//         carregarTopico();
//       } catch (error) {
//         console.error("Erro ao curtir tópico:", error);
//         alert("Erro ao curtir tópico: " + error.message);
//       }
//     }

//     async function likeResposta(respostaId) {
//       try {
//         console.log("Enviando requisição para POST /api/respostas/:id/like");
//         const response = await fetch(`http://127.0.0.1:3000/api/respostas/${respostaId}/like`, {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${auth.token}`,
//           },
//         });
//         console.log("Status da resposta:", response.status, response.statusText);
//         if (!response.ok) {
//           let errorData;
//           try {
//             errorData = await response.json();
//           } catch (e) {
//             errorData = { error: "Sem mensagem de erro retornada" };
//           }
//           console.log("Detalhes do erro:", errorData);
//           throw new Error(`Erro HTTP: ${response.status} - ${errorData.error || response.statusText}`);
//         }
//         carregarTopico();
//       } catch (error) {
//         console.error("Erro ao curtir resposta:", error);
//         alert("Erro ao curtir resposta: " + error.message);
//       }
//     }

//     async function avaliarTopico(topicoId, rating) {
//   try {
//     console.log("Enviando requisição para POST /api/topicos/:id/avaliar", { topicoId, rating });
//     const response = await fetch(`http://127.0.0.1:3000/api/topicos/${topicoId}/avaliar`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${auth.token}`,
//       },
//       body: JSON.stringify({ rating: parseInt(rating) }),
//     });
//     console.log("Status da resposta:", response.status, response.statusText);
//     if (!response.ok) {
//       let errorData;
//       try {
//         errorData = await response.json();
//       } catch (e) {
//         errorData = { error: "Erro desconhecido" };
//       }
//       console.log("Detalhes do erro:", errorData);
//       throw new Error(errorData.error || response.statusText);
//     }
//     carregarTopico();
//   } catch (error) {
//     console.error("Erro ao avaliar tópico:", error.message);
//     alert(`Não foi possível avaliar o tópico: ${error.message}`);
//   }
// }
    
//     window.likeTopico = likeTopico;
//     window.showReplyForm = (respostaId) => {
//       document.getElementById(`reply-form-${respostaId}`).style.display = "block";
//     };
//     window.hideReplyForm = (respostaId) => {
//       document.getElementById(`reply-form-${respostaId}`).style.display = "none";
//     };
//     window.avaliarTopico = avaliarTopico;

//     carregarTopico();
//   } catch (err) {
//     console.error("Erro crítico em post.js:", err.message, err.stack);
//     await new Promise(resolve => setTimeout(resolve, 2000)); // Atraso para ver logs
//     localStorage.removeItem("auth");
//     window.location.href = "login.html";
//   }
// });